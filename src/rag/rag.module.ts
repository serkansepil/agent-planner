import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ExecutionModule } from '../execution/execution.module';
import { RAGController } from './rag.controller';
import { RAGService } from './services/rag.service';
import { ContextBuilderService } from './services/context-builder.service';
import { PromptEngineerService } from './services/prompt-engineer.service';
import { CitationTrackerService } from './services/citation-tracker.service';
import { ConfidenceScorerService } from './services/confidence-scorer.service';
import { ABTestingService } from './services/ab-testing.service';
import { TokenCounterService } from '../execution/services/token-counter.service';

@Module({
  imports: [ConfigModule, PrismaModule, KnowledgeModule, ExecutionModule],
  controllers: [RAGController],
  providers: [
    RAGService,
    ContextBuilderService,
    PromptEngineerService,
    CitationTrackerService,
    ConfidenceScorerService,
    ABTestingService,
    TokenCounterService,
  ],
  exports: [RAGService, ABTestingService],
})
export class RAGModule {}
