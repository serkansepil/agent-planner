import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentProcessorService } from './services/document-processor.service';
import { DocumentChunkerService } from './services/document-chunker.service';
import { MetadataExtractorService } from './services/metadata-extractor.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentProcessorService,
    DocumentChunkerService,
    MetadataExtractorService,
  ],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
