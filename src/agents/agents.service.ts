import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  FilterAgentDto,
  PaginatedAgentResponseDto,
  AgentStatisticsDto,
} from './dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new agent
   */
  async create(userId: string, createAgentDto: CreateAgentDto) {
    return this.prisma.agent.create({
      data: {
        ...createAgentDto,
        ownerId: userId,
      },
    });
  }

  /**
   * Find all agents with pagination, filtering, and search
   */
  async findAll(
    userId: string,
    filterDto: FilterAgentDto,
  ): Promise<PaginatedAgentResponseDto> {
    const {
      search,
      isActive,
      isPublic,
      ownedOnly = false,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    // Build where clause
    const where: any = {
      deletedAt: null, // Exclude soft-deleted agents
      AND: [],
    };

    // Visibility filter: show owned agents OR public agents
    if (ownedOnly) {
      where.ownerId = userId;
    } else {
      where.OR = [{ ownerId: userId }, { isPublic: true }];
    }

    // Search filter
    if (search) {
      where.AND?.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Active status filter
    if (isActive !== undefined) {
      where.AND?.push({ isActive });
    }

    // Public visibility filter
    if (isPublic !== undefined) {
      where.AND?.push({ isPublic });
    }

    // Clean up empty AND array
    if (where.AND?.length === 0) {
      delete where.AND;
    }

    // Build order by
    const orderBy: any = {
      [sortBy]: sortOrder,
    };

    // Get total count
    const total = await this.prisma.agent.count({ where });

    // Get paginated data
    const skip = (page - 1) * limit;
    const agents = await this.prisma.agent.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return {
      data: agents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find one agent by ID with ownership validation
   */
  async findOne(id: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            messages: true,
            workspaceAgents: true,
            knowledgeDocuments: true,
          },
        },
      },
    });

    if (!agent || agent.deletedAt) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    // Validate access: owner or public
    if (agent.ownerId !== userId && !agent.isPublic) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    return agent;
  }

  /**
   * Update an agent (ownership required)
   */
  async update(id: string, userId: string, updateAgentDto: UpdateAgentDto) {
    // Validate ownership
    const agent = await this.validateOwnership(id, userId);

    return this.prisma.agent.update({
      where: { id },
      data: updateAgentDto,
    });
  }

  /**
   * Soft delete an agent (ownership required)
   */
  async remove(id: string, userId: string) {
    // Validate ownership
    await this.validateOwnership(id, userId);

    return this.prisma.agent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Hard delete an agent (ownership required)
   */
  async hardDelete(id: string, userId: string) {
    // Validate ownership
    await this.validateOwnership(id, userId);

    return this.prisma.agent.delete({
      where: { id },
    });
  }

  /**
   * Restore a soft-deleted agent (ownership required)
   */
  async restore(id: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    if (agent.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    if (!agent.deletedAt) {
      throw new ForbiddenException('Agent is not deleted');
    }

    return this.prisma.agent.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Get agent statistics
   */
  async getStatistics(id: string, userId: string): Promise<AgentStatisticsDto> {
    // Validate access
    const agent = await this.findOne(id, userId);

    // Get message count
    const totalMessages = await this.prisma.message.count({
      where: { agentId: id },
    });

    // Get sessions where this agent was involved
    const sessions = await this.prisma.session.findMany({
      where: {
        messages: {
          some: {
            agentId: id,
          },
        },
      },
      select: {
        id: true,
        status: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === 'COMPLETED',
    ).length;
    const successRate =
      totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Calculate average messages per session
    const totalSessionMessages = sessions.reduce(
      (sum, s) => sum + s._count.messages,
      0,
    );
    const avgMessagesPerSession =
      totalSessions > 0 ? totalSessionMessages / totalSessions : 0;

    // Get workspace count
    const totalWorkspaces = await this.prisma.workspaceAgent.count({
      where: { agentId: id, isActive: true },
    });

    // Get knowledge document count
    const totalKnowledgeDocs = await this.prisma.knowledgeDocument.count({
      where: { agentId: id },
    });

    // Get last activity
    const lastMessage = await this.prisma.message.findFirst({
      where: { agentId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      agentId: agent.id,
      agentName: agent.name,
      totalMessages,
      totalSessions,
      totalWorkspaces,
      totalKnowledgeDocs,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
      lastActivityAt: lastMessage?.createdAt,
      createdAt: agent.createdAt,
    };
  }

  /**
   * Search agents by name and description
   */
  async search(userId: string, query: string, limit: number = 10) {
    return this.prisma.agent.findMany({
      where: {
        deletedAt: null,
        OR: [{ ownerId: userId }, { isPublic: true }],
        AND: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        avatar: true,
        isPublic: true,
        ownerId: true,
        createdAt: true,
      },
    });
  }

  /**
   * Validate ownership of an agent
   * @throws NotFoundException if agent not found
   * @throws ForbiddenException if user is not the owner
   */
  private async validateOwnership(id: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent || agent.deletedAt) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    if (agent.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this agent',
      );
    }

    return agent;
  }
}
