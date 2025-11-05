import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentConfigValidatorService } from './services/agent-config-validator.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AgentsController],
  providers: [AgentsService, AgentConfigValidatorService],
  exports: [AgentsService, AgentConfigValidatorService],
})
export class AgentsModule {}
