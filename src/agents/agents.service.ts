import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAgentDto, UpdateAgentDto } from './dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createAgentDto: CreateAgentDto) {
    return this.prisma.agent.create({
      data: {
        ...createAgentDto,
        ownerId: userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.agent.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    if (agent.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    return agent;
  }

  async update(id: string, userId: string, updateAgentDto: UpdateAgentDto) {
    await this.findOne(id, userId);

    return this.prisma.agent.update({
      where: { id },
      data: updateAgentDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.agent.delete({
      where: { id },
    });
  }
}
