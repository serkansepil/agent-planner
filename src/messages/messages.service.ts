import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMessageDto } from './dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createMessageDto: CreateMessageDto) {
    // Verify the session exists and belongs to the user
    const session = await this.prisma.session.findUnique({
      where: { id: createMessageDto.sessionId },
      include: { workspace: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    // If agentId is provided, verify it exists and belongs to the user
    if (createMessageDto.agentId) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: createMessageDto.agentId },
      });

      if (!agent) {
        throw new BadRequestException('Agent not found');
      }

      if (agent.ownerId !== userId) {
        throw new ForbiddenException('You do not have access to this agent');
      }
    }

    return this.prisma.message.create({
      data: createMessageDto,
      include: {
        agent: true,
      },
    });
  }

  async findAllBySession(sessionId: string, userId: string) {
    // Verify the session exists and belongs to the user
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    return this.prisma.message.findMany({
      where: { sessionId },
      include: {
        agent: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        session: true,
        agent: true,
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    // Check if user has access to the session
    const session = await this.prisma.session.findUnique({
      where: { id: message.sessionId },
    });

    if (session?.userId !== userId) {
      throw new ForbiddenException('You do not have access to this message');
    }

    return message;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.message.delete({
      where: { id },
    });
  }
}
