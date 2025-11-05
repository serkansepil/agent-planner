import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddAgentDto,
  UpdateWorkspaceAgentDto,
  CloneWorkspaceDto,
  AgentRole,
  WorkspaceTemplate,
  WorkspaceTemplateType,
} from './dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  // Workspace Templates
  private readonly templates: WorkspaceTemplate[] = [
    {
      id: 'research',
      name: 'Research Workspace',
      description: 'Collaborative workspace for research and analysis',
      type: WorkspaceTemplateType.RESEARCH,
      config: {
        suggestedAgentRoles: [
          {
            role: 'host',
            description: 'Research Lead',
            capabilities: ['coordination', 'analysis', 'synthesis'],
          },
          {
            role: 'specialist',
            description: 'Data Analyst',
            capabilities: ['data_processing', 'statistics', 'visualization'],
          },
          {
            role: 'specialist',
            description: 'Literature Reviewer',
            capabilities: ['document_analysis', 'summarization', 'citation'],
          },
          {
            role: 'support',
            description: 'Documentation Assistant',
            capabilities: ['note_taking', 'formatting', 'organization'],
          },
        ],
        defaultConfig: {
          allowCollaboration: true,
          autoSave: true,
          versionControl: true,
        },
      },
    },
    {
      id: 'development',
      name: 'Software Development',
      description: 'Workspace for software development teams',
      type: WorkspaceTemplateType.DEVELOPMENT,
      config: {
        suggestedAgentRoles: [
          {
            role: 'host',
            description: 'Tech Lead',
            capabilities: ['architecture', 'code_review', 'mentoring'],
          },
          {
            role: 'specialist',
            description: 'Backend Developer',
            capabilities: ['api_development', 'database', 'testing'],
          },
          {
            role: 'specialist',
            description: 'Frontend Developer',
            capabilities: ['ui_development', 'responsive_design', 'testing'],
          },
          {
            role: 'support',
            description: 'DevOps Engineer',
            capabilities: ['deployment', 'monitoring', 'automation'],
          },
        ],
        defaultConfig: {
          gitIntegration: true,
          cicdEnabled: true,
          codeReviewRequired: true,
        },
      },
    },
    {
      id: 'customer_support',
      name: 'Customer Support',
      description: 'Workspace for customer service teams',
      type: WorkspaceTemplateType.CUSTOMER_SUPPORT,
      config: {
        suggestedAgentRoles: [
          {
            role: 'host',
            description: 'Support Lead',
            capabilities: ['escalation', 'training', 'quality_assurance'],
          },
          {
            role: 'specialist',
            description: 'Technical Support',
            capabilities: ['troubleshooting', 'product_knowledge', 'documentation'],
          },
          {
            role: 'support',
            description: 'Customer Success',
            capabilities: ['onboarding', 'relationship_management', 'feedback'],
          },
        ],
        defaultConfig: {
          ticketingSystem: true,
          responseTimeTracking: true,
          satisfactionSurveys: true,
        },
      },
    },
    {
      id: 'data_analysis',
      name: 'Data Analysis',
      description: 'Workspace for data science and analytics',
      type: WorkspaceTemplateType.DATA_ANALYSIS,
      config: {
        suggestedAgentRoles: [
          {
            role: 'host',
            description: 'Data Science Lead',
            capabilities: ['model_design', 'strategy', 'validation'],
          },
          {
            role: 'specialist',
            description: 'ML Engineer',
            capabilities: ['model_training', 'feature_engineering', 'optimization'],
          },
          {
            role: 'specialist',
            description: 'Data Engineer',
            capabilities: ['data_pipeline', 'etl', 'data_quality'],
          },
          {
            role: 'support',
            description: 'Visualization Specialist',
            capabilities: ['dashboards', 'reporting', 'storytelling'],
          },
        ],
        defaultConfig: {
          jupyterIntegration: true,
          versionedDatasets: true,
          experimentTracking: true,
        },
      },
    },
    {
      id: 'content_creation',
      name: 'Content Creation',
      description: 'Workspace for content teams',
      type: WorkspaceTemplateType.CONTENT_CREATION,
      config: {
        suggestedAgentRoles: [
          {
            role: 'host',
            description: 'Content Director',
            capabilities: ['strategy', 'editorial', 'quality_control'],
          },
          {
            role: 'specialist',
            description: 'Writer',
            capabilities: ['writing', 'research', 'seo'],
          },
          {
            role: 'specialist',
            description: 'Designer',
            capabilities: ['visual_design', 'branding', 'layout'],
          },
          {
            role: 'support',
            description: 'Editor',
            capabilities: ['proofreading', 'fact_checking', 'formatting'],
          },
        ],
        defaultConfig: {
          contentCalendar: true,
          approvalWorkflow: true,
          assetManagement: true,
        },
      },
    },
  ];

  // ==================== CRUD Operations ====================

  async create(userId: string, createWorkspaceDto: CreateWorkspaceDto) {
    // Verify the host agent exists and belongs to the user
    const hostAgent = await this.prisma.agent.findUnique({
      where: { id: createWorkspaceDto.hostAgentId },
    });

    if (!hostAgent) {
      throw new BadRequestException('Host agent not found');
    }

    if (hostAgent.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    // Verify additional agents if provided
    if (createWorkspaceDto.agentIds?.length) {
      const agents = await this.prisma.agent.findMany({
        where: {
          id: { in: createWorkspaceDto.agentIds },
          ownerId: userId,
        },
      });

      if (agents.length !== createWorkspaceDto.agentIds.length) {
        throw new BadRequestException('Some agents not found or not accessible');
      }
    }

    // Get template if specified
    let templateConfig = {};
    if (createWorkspaceDto.templateId) {
      const template = this.templates.find(
        (t) => t.id === createWorkspaceDto.templateId,
      );
      if (template) {
        templateConfig = template.config.defaultConfig || {};
      }
    }

    // Create workspace with host agent and additional agents
    const workspace = await this.prisma.workspace.create({
      data: {
        name: createWorkspaceDto.name,
        description: createWorkspaceDto.description,
        avatar: createWorkspaceDto.avatar,
        config: {
          ...templateConfig,
          ...createWorkspaceDto.config,
        },
        metadata: createWorkspaceDto.metadata,
        ownerId: userId,
        workspaceAgents: {
          create: [
            // Add host agent
            {
              agentId: createWorkspaceDto.hostAgentId,
              role: AgentRole.HOST,
              order: 0,
              isActive: true,
            },
            // Add additional agents
            ...(createWorkspaceDto.agentIds?.map((agentId, index) => ({
              agentId,
              role: AgentRole.MEMBER,
              order: index + 1,
              isActive: true,
            })) || []),
          ],
        },
      },
      include: {
        workspaceAgents: {
          include: {
            agent: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return workspace;
  }

  async findAll(userId: string, includeArchived = false) {
    return this.prisma.workspace.findMany({
      where: {
        ownerId: userId,
        ...(includeArchived ? {} : { isActive: true }),
      },
      include: {
        workspaceAgents: {
          where: { isActive: true },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isActive: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            sessions: true,
            integrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        workspaceAgents: {
          include: {
            agent: true,
          },
          orderBy: { order: 'asc' },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
          },
        },
        integrations: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            integrations: true,
            knowledgeDocuments: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return workspace;
  }

  async update(
    id: string,
    userId: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    await this.findOne(id, userId);

    // If updating hostAgentId, verify the agent exists and belongs to the user
    if (updateWorkspaceDto.hostAgentId) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: updateWorkspaceDto.hostAgentId },
      });

      if (!agent) {
        throw new BadRequestException('Host agent not found');
      }

      if (agent.ownerId !== userId) {
        throw new ForbiddenException('You do not have access to this agent');
      }

      // Update the host agent in WorkspaceAgent table
      const existingHost = await this.prisma.workspaceAgent.findFirst({
        where: {
          workspaceId: id,
          role: AgentRole.HOST,
        },
      });

      if (existingHost) {
        // Update existing host agent role to member
        await this.prisma.workspaceAgent.update({
          where: { id: existingHost.id },
          data: { role: AgentRole.MEMBER },
        });
      }

      // Set new host agent
      const newHostAgent = await this.prisma.workspaceAgent.findFirst({
        where: {
          workspaceId: id,
          agentId: updateWorkspaceDto.hostAgentId,
        },
      });

      if (newHostAgent) {
        await this.prisma.workspaceAgent.update({
          where: { id: newHostAgent.id },
          data: { role: AgentRole.HOST },
        });
      } else {
        await this.prisma.workspaceAgent.create({
          data: {
            workspaceId: id,
            agentId: updateWorkspaceDto.hostAgentId,
            role: AgentRole.HOST,
            order: 0,
          },
        });
      }
    }

    // Remove hostAgentId and agentIds from update data as they're handled separately
    const { hostAgentId, agentIds, ...updateData } = updateWorkspaceDto;

    return this.prisma.workspace.update({
      where: { id },
      data: updateData,
      include: {
        workspaceAgents: {
          include: {
            agent: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.workspace.delete({
      where: { id },
    });
  }

  // ==================== Agent Management ====================

  async addAgent(workspaceId: string, userId: string, addAgentDto: AddAgentDto) {
    const workspace = await this.findOne(workspaceId, userId);

    // Verify agent exists and belongs to user
    const agent = await this.prisma.agent.findUnique({
      where: { id: addAgentDto.agentId },
    });

    if (!agent) {
      throw new BadRequestException('Agent not found');
    }

    if (agent.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    // Check if agent is already in workspace
    const existingAgent = await this.prisma.workspaceAgent.findUnique({
      where: {
        workspaceId_agentId: {
          workspaceId,
          agentId: addAgentDto.agentId,
        },
      },
    });

    if (existingAgent) {
      throw new ConflictException('Agent is already in this workspace');
    }

    // If role is HOST, demote existing host
    if (addAgentDto.role === AgentRole.HOST) {
      await this.prisma.workspaceAgent.updateMany({
        where: {
          workspaceId,
          role: AgentRole.HOST,
        },
        data: {
          role: AgentRole.MEMBER,
        },
      });
    }

    // Get max order for new agent
    const maxOrder = await this.prisma.workspaceAgent.aggregate({
      where: { workspaceId },
      _max: { order: true },
    });

    const workspaceAgent = await this.prisma.workspaceAgent.create({
      data: {
        workspaceId,
        agentId: addAgentDto.agentId,
        role: addAgentDto.role || AgentRole.MEMBER,
        order: addAgentDto.order ?? (maxOrder._max.order || 0) + 1,
        config: addAgentDto.config,
        isActive: addAgentDto.isActive ?? true,
      },
      include: {
        agent: true,
      },
    });

    return workspaceAgent;
  }

  async removeAgent(workspaceId: string, agentId: string, userId: string) {
    await this.findOne(workspaceId, userId);

    const workspaceAgent = await this.prisma.workspaceAgent.findUnique({
      where: {
        workspaceId_agentId: {
          workspaceId,
          agentId,
        },
      },
    });

    if (!workspaceAgent) {
      throw new NotFoundException('Agent not found in workspace');
    }

    // Don't allow removing the last host agent
    if (workspaceAgent.role === AgentRole.HOST) {
      const hostCount = await this.prisma.workspaceAgent.count({
        where: {
          workspaceId,
          role: AgentRole.HOST,
        },
      });

      if (hostCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last host agent from workspace',
        );
      }
    }

    await this.prisma.workspaceAgent.delete({
      where: {
        workspaceId_agentId: {
          workspaceId,
          agentId,
        },
      },
    });

    return { message: 'Agent removed from workspace successfully' };
  }

  async updateWorkspaceAgent(
    workspaceId: string,
    agentId: string,
    userId: string,
    updateDto: UpdateWorkspaceAgentDto,
  ) {
    await this.findOne(workspaceId, userId);

    const workspaceAgent = await this.prisma.workspaceAgent.findUnique({
      where: {
        workspaceId_agentId: {
          workspaceId,
          agentId,
        },
      },
    });

    if (!workspaceAgent) {
      throw new NotFoundException('Agent not found in workspace');
    }

    // If changing to HOST role, demote existing host
    if (updateDto.role === AgentRole.HOST && workspaceAgent.role !== AgentRole.HOST) {
      await this.prisma.workspaceAgent.updateMany({
        where: {
          workspaceId,
          role: AgentRole.HOST,
        },
        data: {
          role: AgentRole.MEMBER,
        },
      });
    }

    return this.prisma.workspaceAgent.update({
      where: {
        workspaceId_agentId: {
          workspaceId,
          agentId,
        },
      },
      data: updateDto,
      include: {
        agent: true,
      },
    });
  }

  async getWorkspaceAgents(workspaceId: string, userId: string) {
    await this.findOne(workspaceId, userId);

    return this.prisma.workspaceAgent.findMany({
      where: { workspaceId },
      include: {
        agent: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  // ==================== Templates ====================

  async getTemplates() {
    return this.templates;
  }

  async getTemplate(templateId: string) {
    const template = this.templates.find((t) => t.id === templateId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async createFromTemplate(
    userId: string,
    templateId: string,
    name: string,
    hostAgentId: string,
  ) {
    const template = await this.getTemplate(templateId);

    return this.create(userId, {
      name,
      description: template.description,
      hostAgentId,
      templateId,
    });
  }

  // ==================== Cloning ====================

  async cloneWorkspace(
    workspaceId: string,
    userId: string,
    cloneDto: CloneWorkspaceDto,
  ) {
    const sourceWorkspace = await this.findOne(workspaceId, userId);

    // Create cloned workspace
    const clonedWorkspace = await this.prisma.workspace.create({
      data: {
        name: cloneDto.name,
        description: cloneDto.description || sourceWorkspace.description,
        avatar: sourceWorkspace.avatar,
        config: cloneDto.includeConfig ? sourceWorkspace.config : {},
        metadata: {
          clonedFrom: workspaceId,
          clonedAt: new Date().toISOString(),
        },
        ownerId: userId,
      },
    });

    // Clone workspace agents if requested
    if (cloneDto.includeAgents) {
      const agentsToClone = sourceWorkspace.workspaceAgents.map((wa) => ({
        workspaceId: clonedWorkspace.id,
        agentId: wa.agentId,
        role: wa.role,
        order: wa.order,
        config: wa.config,
        isActive: wa.isActive,
      }));

      await this.prisma.workspaceAgent.createMany({
        data: agentsToClone,
      });
    }

    // Clone integrations if requested
    if (cloneDto.includeIntegrations) {
      const integrationsToClone = await this.prisma.integration.findMany({
        where: { workspaceId },
      });

      await this.prisma.integration.createMany({
        data: integrationsToClone.map((integration) => ({
          name: integration.name,
          description: integration.description,
          type: integration.type,
          status: 'INACTIVE', // Set to inactive by default
          config: integration.config,
          workspaceId: clonedWorkspace.id,
          userId,
        })),
      });
    }

    // Return full workspace with relations
    return this.findOne(clonedWorkspace.id, userId);
  }

  // ==================== Archive/Restore ====================

  async archiveWorkspace(workspaceId: string, userId: string) {
    await this.findOne(workspaceId, userId);

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        isActive: false,
        metadata: {
          archivedAt: new Date().toISOString(),
        },
      },
    });
  }

  async restoreWorkspace(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        isActive: true,
        metadata: {
          restoredAt: new Date().toISOString(),
        },
      },
    });
  }

  async getArchivedWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        ownerId: userId,
        isActive: false,
      },
      include: {
        workspaceAgents: {
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
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
