import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionStatus,
  PauseSessionDto,
  ResumeSessionDto,
  SessionAnalytics,
  SessionTimeline,
  SessionTimelineEvent,
  ExportSessionDto,
  SessionExport,
  SessionReplay,
  SessionReplayFrame,
} from './dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  // In-memory stores for session management
  private sessionContexts = new Map<string, Record<string, any>>();
  private sessionTimeouts = new Map<string, NodeJS.Timeout>();
  private sessionTimelines = new Map<string, SessionTimelineEvent[]>();
  private activeSessionsByUser = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Lifecycle Management ====================

  async create(userId: string, createSessionDto: CreateSessionDto) {
    // Verify the workspace exists and belongs to the user
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: createSessionDto.workspaceId },
      include: {
        workspaceAgents: {
          where: { isActive: true },
          include: { agent: true },
        },
      },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Create session
    const session = await this.prisma.session.create({
      data: {
        workspaceId: createSessionDto.workspaceId,
        userId,
        title: createSessionDto.title,
        status: SessionStatus.ACTIVE,
        metadata: createSessionDto.metadata || {},
        startedAt: new Date(),
      },
      include: {
        workspace: {
          include: {
            workspaceAgents: {
              where: { isActive: true },
              include: { agent: true },
            },
          },
        },
      },
    });

    // Initialize session context
    if (createSessionDto.initialContext) {
      this.sessionContexts.set(session.id, createSessionDto.initialContext);
    } else {
      this.sessionContexts.set(session.id, {});
    }

    // Track active session
    const userSessions = this.activeSessionsByUser.get(userId) || new Set();
    userSessions.add(session.id);
    this.activeSessionsByUser.set(userId, userSessions);

    // Setup timeout if specified
    if (createSessionDto.timeout) {
      this.setupSessionTimeout(session.id, createSessionDto.timeout);
    }

    // Add timeline event
    this.addTimelineEvent(session.id, {
      timestamp: new Date(),
      type: 'session_started',
      actor: userId,
      description: `Session "${session.title || 'Untitled'}" started`,
      data: { workspaceId: workspace.id },
    });

    this.logger.log(`Session ${session.id} created for user ${userId}`);

    return session;
  }

  async findAll(userId: string, workspaceId?: string, status?: SessionStatus) {
    const where: any = { userId };

    if (workspaceId) {
      // Verify the workspace belongs to the user
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new BadRequestException('Workspace not found');
      }

      if (workspace.ownerId !== userId) {
        throw new ForbiddenException('You do not have access to this workspace');
      }

      where.workspaceId = workspaceId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.session.findMany({
      where,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            workspaceAgents: {
              include: { agent: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    // Include context
    const context = this.sessionContexts.get(id) || {};
    return {
      ...session,
      context,
    };
  }

  async update(id: string, userId: string, updateSessionDto: UpdateSessionDto) {
    await this.findOne(id, userId);

    return this.prisma.session.update({
      where: { id },
      data: updateSessionDto,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    // Cleanup
    this.cleanupSession(id, userId);

    return this.prisma.session.delete({
      where: { id },
    });
  }

  async endSession(id: string, userId: string): Promise<any> {
    const session = await this.findOne(id, userId);

    if (session.status !== SessionStatus.ACTIVE && session.status !== SessionStatus.PAUSED) {
      throw new BadRequestException('Session is not active or paused');
    }

    const updatedSession = await this.prisma.session.update({
      where: { id },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
      },
      include: {
        workspace: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    // Add timeline event
    this.addTimelineEvent(id, {
      timestamp: new Date(),
      type: 'session_ended',
      actor: userId,
      description: 'Session ended',
    });

    // Cleanup
    this.cleanupSession(id, userId);

    this.logger.log(`Session ${id} ended`);

    return updatedSession;
  }

  async pauseSession(id: string, userId: string, pauseDto: PauseSessionDto): Promise<any> {
    const session = await this.findOne(id, userId);

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Only active sessions can be paused');
    }

    const updatedSession = await this.prisma.session.update({
      where: { id },
      data: {
        status: SessionStatus.PAUSED,
        metadata: {
          ...session.metadata,
          pausedAt: new Date(),
          pauseReason: pauseDto.reason,
        },
      },
    });

    // Clear timeout while paused
    if (this.sessionTimeouts.has(id)) {
      clearTimeout(this.sessionTimeouts.get(id)!);
      this.sessionTimeouts.delete(id);
    }

    // Add timeline event
    this.addTimelineEvent(id, {
      timestamp: new Date(),
      type: 'session_paused',
      actor: userId,
      description: `Session paused${pauseDto.reason ? `: ${pauseDto.reason}` : ''}`,
    });

    this.logger.log(`Session ${id} paused`);

    return updatedSession;
  }

  async resumeSession(id: string, userId: string, resumeDto: ResumeSessionDto): Promise<any> {
    const session = await this.findOne(id, userId);

    if (session.status !== SessionStatus.PAUSED) {
      throw new BadRequestException('Only paused sessions can be resumed');
    }

    const updatedSession = await this.prisma.session.update({
      where: { id },
      data: {
        status: SessionStatus.ACTIVE,
        metadata: {
          ...session.metadata,
          resumedAt: new Date(),
          resumeNotes: resumeDto.notes,
        },
      },
    });

    // Add timeline event
    this.addTimelineEvent(id, {
      timestamp: new Date(),
      type: 'session_resumed',
      actor: userId,
      description: `Session resumed${resumeDto.notes ? `: ${resumeDto.notes}` : ''}`,
    });

    this.logger.log(`Session ${id} resumed`);

    return updatedSession;
  }

  // ==================== Context Management ====================

  async getSessionContext(sessionId: string, userId: string): Promise<Record<string, any>> {
    await this.findOne(sessionId, userId);
    return this.sessionContexts.get(sessionId) || {};
  }

  async updateSessionContext(
    sessionId: string,
    userId: string,
    context: Record<string, any>,
  ): Promise<void> {
    await this.findOne(sessionId, userId);

    const existingContext = this.sessionContexts.get(sessionId) || {};
    this.sessionContexts.set(sessionId, {
      ...existingContext,
      ...context,
    });

    // Add timeline event
    this.addTimelineEvent(sessionId, {
      timestamp: new Date(),
      type: 'context_updated',
      actor: userId,
      description: `Context updated with ${Object.keys(context).length} keys`,
      data: { keys: Object.keys(context) },
    });

    this.logger.debug(`Context updated for session ${sessionId}`);
  }

  async clearSessionContext(sessionId: string, userId: string): Promise<void> {
    await this.findOne(sessionId, userId);
    this.sessionContexts.set(sessionId, {});
    this.logger.debug(`Context cleared for session ${sessionId}`);
  }

  // ==================== Timeout Management ====================

  private setupSessionTimeout(sessionId: string, timeout: number): void {
    const timeoutId = setTimeout(() => {
      this.handleSessionTimeout(sessionId);
    }, timeout);

    this.sessionTimeouts.set(sessionId, timeoutId);
    this.logger.debug(`Timeout set for session ${sessionId}: ${timeout}ms`);
  }

  private async handleSessionTimeout(sessionId: string): Promise<void> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.status !== SessionStatus.ACTIVE) {
        return;
      }

      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          endedAt: new Date(),
          metadata: {
            ...session.metadata,
            timedOut: true,
          },
        },
      });

      // Add timeline event
      this.addTimelineEvent(sessionId, {
        timestamp: new Date(),
        type: 'session_ended',
        description: 'Session timed out',
        data: { reason: 'timeout' },
      });

      this.cleanupSession(sessionId, session.userId);

      this.logger.log(`Session ${sessionId} timed out and was ended`);
    } catch (error) {
      this.logger.error(`Error handling session timeout: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupInactiveSessions(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const inactiveSessions = await this.prisma.session.findMany({
        where: {
          status: SessionStatus.ACTIVE,
          updatedAt: {
            lt: oneDayAgo,
          },
        },
      });

      for (const session of inactiveSessions) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: {
            status: SessionStatus.COMPLETED,
            endedAt: new Date(),
            metadata: {
              ...session.metadata,
              autoEnded: true,
              reason: 'inactivity',
            },
          },
        });

        this.cleanupSession(session.id, session.userId);
      }

      if (inactiveSessions.length > 0) {
        this.logger.log(`Cleaned up ${inactiveSessions.length} inactive sessions`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up inactive sessions: ${error.message}`);
    }
  }

  // ==================== Concurrent Session Handling ====================

  async getActiveSessions(userId: string): Promise<any[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getConcurrentSessionCount(userId: string): Promise<number> {
    const sessions = this.activeSessionsByUser.get(userId);
    return sessions ? sessions.size : 0;
  }

  // ==================== Session Analytics ====================

  async getSessionAnalytics(sessionId: string, userId: string): Promise<SessionAnalytics> {
    const session = await this.findOne(sessionId, userId);

    // Calculate duration
    const startedAt = new Date(session.startedAt);
    const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();
    const duration = endedAt.getTime() - startedAt.getTime();

    // Message metrics
    const messages = session.messages || [];
    const messagesByRole: Record<string, number> = {};
    const messagesByAgent: Record<string, number> = {};
    const tokensByAgent: Record<string, number> = {};
    const agentParticipationMap = new Map<string, any>();

    for (const message of messages) {
      // By role
      messagesByRole[message.role] = (messagesByRole[message.role] || 0) + 1;

      // By agent
      if (message.agentId) {
        messagesByAgent[message.agentId] = (messagesByAgent[message.agentId] || 0) + 1;

        if (message.tokens) {
          tokensByAgent[message.agentId] = (tokensByAgent[message.agentId] || 0) + message.tokens;
        }

        // Agent participation
        if (!agentParticipationMap.has(message.agentId)) {
          agentParticipationMap.set(message.agentId, {
            agentId: message.agentId,
            agentName: message.agent?.name || 'Unknown',
            messageCount: 0,
            firstMessageAt: message.createdAt,
            lastMessageAt: message.createdAt,
          });
        }

        const participation = agentParticipationMap.get(message.agentId);
        participation.messageCount++;
        participation.lastMessageAt = message.createdAt;
      }
    }

    const agentParticipation = Array.from(agentParticipationMap.values());

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    for (let i = 1; i < messages.length; i++) {
      const timeDiff = new Date(messages[i].createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime();
      if (timeDiff < 60000) { // Only count if within 1 minute
        totalResponseTime += timeDiff;
        responseCount++;
      }
    }
    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : undefined;

    // Messages per hour
    const messagesPerHour = duration > 0 ? (messages.length / (duration / (1000 * 60 * 60))) : 0;

    // Total tokens
    const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

    // Context metrics
    const context = this.sessionContexts.get(sessionId) || {};
    const contextKeys = Object.keys(context);

    return {
      sessionId: session.id,
      workspaceId: session.workspaceId,
      userId: session.userId,
      title: session.title,
      status: session.status,
      startedAt,
      endedAt: session.endedAt ? endedAt : undefined,
      duration,
      totalMessages: messages.length,
      messagesByRole,
      messagesByAgent,
      agentsUsed: Object.keys(messagesByAgent),
      agentParticipation,
      averageResponseTime,
      messagesPerHour,
      totalTokens: totalTokens > 0 ? totalTokens : undefined,
      tokensByAgent: Object.keys(tokensByAgent).length > 0 ? tokensByAgent : undefined,
      contextSize: JSON.stringify(context).length,
      contextKeys,
      metadata: session.metadata,
    };
  }

  async getSessionTimeline(sessionId: string, userId: string): Promise<SessionTimeline> {
    await this.findOne(sessionId, userId);

    const events = this.sessionTimelines.get(sessionId) || [];

    return {
      sessionId,
      events,
    };
  }

  // ==================== Session Export ====================

  async exportSession(
    sessionId: string,
    userId: string,
    exportDto: ExportSessionDto,
  ): Promise<SessionExport> {
    const session = await this.findOne(sessionId, userId);

    const exportData: SessionExport = {
      session: {
        id: session.id,
        workspaceId: session.workspaceId,
        userId: session.userId,
        title: session.title,
        status: session.status,
        startedAt: new Date(session.startedAt),
        endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
      },
      exportedAt: new Date(),
      format: exportDto.format || 'json',
    };

    if (exportDto.includeMessages) {
      exportData.messages = session.messages;
    }

    if (exportDto.includeContext) {
      exportData.context = this.sessionContexts.get(sessionId) || {};
    }

    if (exportDto.includeAnalytics) {
      exportData.analytics = await this.getSessionAnalytics(sessionId, userId);
    }

    if (exportDto.includeMetadata) {
      exportData.metadata = session.metadata;
    }

    return exportData;
  }

  async formatExport(exportData: SessionExport, format: string): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);

      case 'markdown':
        return this.formatAsMarkdown(exportData);

      case 'html':
        return this.formatAsHtml(exportData);

      case 'csv':
        return this.formatAsCsv(exportData);

      default:
        return JSON.stringify(exportData, null, 2);
    }
  }

  private formatAsMarkdown(data: SessionExport): string {
    let md = `# Session: ${data.session.title || 'Untitled'}\n\n`;
    md += `**ID:** ${data.session.id}\n`;
    md += `**Started:** ${data.session.startedAt}\n`;
    if (data.session.endedAt) {
      md += `**Ended:** ${data.session.endedAt}\n`;
    }
    md += `**Status:** ${data.session.status}\n\n`;

    if (data.messages && data.messages.length > 0) {
      md += `## Messages (${data.messages.length})\n\n`;
      data.messages.forEach((msg: any, idx: number) => {
        md += `### ${idx + 1}. ${msg.role}${msg.agent ? ` (${msg.agent.name})` : ''}\n`;
        md += `${msg.content}\n\n`;
      });
    }

    if (data.analytics) {
      md += `## Analytics\n\n`;
      md += `- **Total Messages:** ${data.analytics.totalMessages}\n`;
      if (data.analytics.duration) {
        md += `- **Duration:** ${Math.round(data.analytics.duration / 1000)} seconds\n`;
      }
      md += `- **Agents Used:** ${data.analytics.agentsUsed.length}\n`;
    }

    return md;
  }

  private formatAsHtml(data: SessionExport): string {
    let html = `<!DOCTYPE html><html><head><title>Session ${data.session.title || 'Export'}</title>`;
    html += `<style>body{font-family:Arial,sans-serif;margin:20px;}h1,h2{color:#333;}.message{border-left:3px solid #007bff;padding:10px;margin:10px 0;background:#f8f9fa;}</style>`;
    html += `</head><body>`;
    html += `<h1>Session: ${data.session.title || 'Untitled'}</h1>`;
    html += `<p><strong>ID:</strong> ${data.session.id}</p>`;
    html += `<p><strong>Started:</strong> ${data.session.startedAt}</p>`;

    if (data.messages && data.messages.length > 0) {
      html += `<h2>Messages</h2>`;
      data.messages.forEach((msg: any) => {
        html += `<div class="message">`;
        html += `<strong>${msg.role}${msg.agent ? ` (${msg.agent.name})` : ''}</strong><br>`;
        html += `${msg.content}`;
        html += `</div>`;
      });
    }

    html += `</body></html>`;
    return html;
  }

  private formatAsCsv(data: SessionExport): string {
    if (!data.messages || data.messages.length === 0) {
      return 'timestamp,role,agent,content\n';
    }

    let csv = 'timestamp,role,agent,content\n';
    data.messages.forEach((msg: any) => {
      const content = msg.content.replace(/"/g, '""');
      csv += `"${msg.createdAt}","${msg.role}","${msg.agent?.name || ''}","${content}"\n`;
    });

    return csv;
  }

  // ==================== Session Replay ====================

  async getSessionReplay(
    sessionId: string,
    userId: string,
    playbackSpeed: number = 1.0,
  ): Promise<SessionReplay> {
    const session = await this.findOne(sessionId, userId);

    const frames: SessionReplayFrame[] = [];
    const messages = session.messages || [];

    messages.forEach((msg: any, index: number) => {
      frames.push({
        timestamp: new Date(msg.createdAt),
        index,
        messageId: msg.id,
        content: msg.content,
        role: msg.role,
        agentId: msg.agentId,
        agentName: msg.agent?.name,
        contextSnapshot: { ...this.sessionContexts.get(sessionId) },
        metadata: msg.metadata,
      });
    });

    const duration = frames.length > 0
      ? frames[frames.length - 1].timestamp.getTime() - frames[0].timestamp.getTime()
      : 0;

    const agentsInvolved = [...new Set(frames.map(f => f.agentId).filter(Boolean))] as string[];

    return {
      sessionId,
      frames,
      duration,
      frameCount: frames.length,
      playbackSpeed,
      metadata: {
        recordedAt: new Date(session.startedAt),
        totalMessages: messages.length,
        agentsInvolved,
      },
    };
  }

  // ==================== Utility Methods ====================

  private addTimelineEvent(sessionId: string, event: SessionTimelineEvent): void {
    const timeline = this.sessionTimelines.get(sessionId) || [];
    timeline.push(event);
    this.sessionTimelines.set(sessionId, timeline);
  }

  private cleanupSession(sessionId: string, userId: string): void {
    // Clear timeout
    if (this.sessionTimeouts.has(sessionId)) {
      clearTimeout(this.sessionTimeouts.get(sessionId)!);
      this.sessionTimeouts.delete(sessionId);
    }

    // Remove from active sessions
    const userSessions = this.activeSessionsByUser.get(userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.activeSessionsByUser.delete(userId);
      }
    }

    // Keep context and timeline for a while (they can be cleared manually or by cron)
    this.logger.debug(`Cleaned up session ${sessionId}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldSessionData(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const oldSessions = await this.prisma.session.findMany({
      where: {
        endedAt: {
          lt: sevenDaysAgo,
        },
      },
      select: { id: true },
    });

    for (const session of oldSessions) {
      this.sessionContexts.delete(session.id);
      this.sessionTimelines.delete(session.id);
    }

    this.logger.log(`Cleaned up data for ${oldSessions.length} old sessions`);
  }
}
