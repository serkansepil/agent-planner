import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createWorkspaceDto: CreateWorkspaceDto) {
    // Verify the agent exists and belongs to the user
    const agent = await this.prisma.agent.findUnique({
      where: { id: createWorkspaceDto.hostAgentId },
    });

    if (!agent) {
      throw new BadRequestException('Host agent not found');
    }

    if (agent.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    return this.prisma.workspace.create({
      data: {
        ...createWorkspaceDto,
        ownerId: userId,
      },
      include: {
        hostAgent: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: { ownerId: userId },
      include: {
        hostAgent: true,
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        hostAgent: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
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
    }

    return this.prisma.workspace.update({
      where: { id },
      data: updateWorkspaceDto,
      include: {
        hostAgent: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.workspace.delete({
      where: { id },
    });
  }
}
