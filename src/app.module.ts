import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core modules
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AgentsModule } from './agents/agents.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SessionsModule } from './sessions/sessions.module';
import { MessagesModule } from './messages/messages.module';
import { ExecutionModule } from './execution/execution.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { RAGModule } from './rag/rag.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Core modules (order matters)
    CommonModule, // Must be first for global providers
    ConfigModule,
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    AgentsModule,
    WorkspacesModule,
    SessionsModule,
    MessagesModule,
    ExecutionModule,
    KnowledgeModule,
    RAGModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
