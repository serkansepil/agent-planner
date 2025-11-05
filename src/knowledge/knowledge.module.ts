import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentProcessorService } from './services/document-processor.service';
import { DocumentChunkerService } from './services/document-chunker.service';
import { MetadataExtractorService } from './services/metadata-extractor.service';
import { EmbeddingService } from './services/embedding.service';
import { VectorSearchService } from './services/vector-search.service';
import { HybridSearchService } from './services/hybrid-search.service';
import { CacheService } from '../execution/services/cache.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentProcessorService,
    DocumentChunkerService,
    MetadataExtractorService,
    EmbeddingService,
    VectorSearchService,
    HybridSearchService,
    CacheService,
  ],
  exports: [KnowledgeService, EmbeddingService, VectorSearchService, HybridSearchService],
})
export class KnowledgeModule {}
