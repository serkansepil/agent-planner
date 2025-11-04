import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSessionDto, UpdateSessionDto } from './dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createSessionDto: CreateSessionDto) {
    // Verify the workspace exists and belongs to the user
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: createSessionDto.workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return this.prisma.session.create({
      data: {
        workspaceId: createSessionDto.workspaceId,
        userId,
      },
      include: {
        workspace: {
          include: {
            hostAgent: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, workspaceId?: string) {
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

    return this.prisma.session.findMany({
      where,
      include: {
        workspace: {
          include: {
            hostAgent: true,
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
            hostAgent: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            agent: true,
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

    return session;
  }

  async update(id: string, userId: string, updateSessionDto: UpdateSessionDto) {
    await this.findOne(id, userId);

    return this.prisma.session.update({
      where: { id },
      data: updateSessionDto,
      include: {
        workspace: {
          include: {
            hostAgent: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.session.delete({
      where: { id },
    });
  }
}
