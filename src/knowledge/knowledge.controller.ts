import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { KnowledgeService } from './knowledge.service';
import {
  UploadDocumentDto,
  DocumentResponseDto,
  FilterDocumentDto,
  PaginatedDocumentResponseDto,
  DocumentChunkResponseDto,
  BulkUploadResultDto,
  SearchQueryDto,
  SearchResponseDto,
  GenerateEmbeddingsDto,
  EmbeddingStatisticsDto,
} from './dto';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: { type: 'string' },
        source: { type: 'string' },
        sourceUrl: { type: 'string' },
        workspaceId: { type: 'string' },
        agentId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        chunkSize: { type: 'number', default: 1000 },
        chunkOverlap: { type: 'number', default: 200 },
        extractMetadata: { type: 'boolean', default: true },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @ApiResponse({ status: 409, description: 'Document already exists' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.knowledgeService.uploadDocument(file, user.id, dto);
  }

  @Post('bulk-upload')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiOperation({ summary: 'Bulk upload multiple documents' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        workspaceId: { type: 'string' },
        agentId: { type: 'string' },
        chunkSize: { type: 'number', default: 1000 },
        chunkOverlap: { type: 'number', default: 200 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk upload completed',
    type: BulkUploadResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid files or parameters' })
  async bulkUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: any,
  ): Promise<BulkUploadResultDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return await this.knowledgeService.bulkUpload(files, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: PaginatedDocumentResponseDto,
  })
  async findAll(
    @CurrentUser() user: any,
    @Query() filter: FilterDocumentDto,
  ): Promise<PaginatedDocumentResponseDto> {
    return await this.knowledgeService.findAll(user.id, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto> {
    return await this.knowledgeService.findOne(id, user.id);
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: 'Get document chunks' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Chunks retrieved successfully',
    type: [DocumentChunkResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getChunks(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<DocumentChunkResponseDto[]> {
    return await this.knowledgeService.getChunks(id, user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get document versions' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Versions retrieved successfully',
    type: [DocumentResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getVersions(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto[]> {
    return await this.knowledgeService.getVersions(id, user.id);
  }

  @Post(':id/version')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new version of a document' })
  @ApiParam({ name: 'id', description: 'Original document ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: { type: 'string' },
        chunkSize: { type: 'number', default: 1000 },
        chunkOverlap: { type: 'number', default: 200 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'New version created successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Original document not found' })
  async createVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: any,
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.knowledgeService.createVersion(id, file, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document (cascade to chunks)' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    await this.knowledgeService.delete(id, user.id);
    return { message: 'Document deleted successfully' };
  }

  @Post('search')
  @ApiOperation({ summary: 'Search documents using vector similarity and/or keywords' })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: SearchResponseDto,
  })
  async search(
    @CurrentUser() user: any,
    @Body() dto: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    return await this.knowledgeService.search(user.id, dto);
  }

  @Post('embeddings/generate')
  @ApiOperation({ summary: 'Generate embeddings for document chunks' })
  @ApiResponse({
    status: 200,
    description: 'Embedding generation started',
  })
  async generateEmbeddings(
    @CurrentUser() user: any,
    @Body() dto: GenerateEmbeddingsDto,
  ): Promise<{ processed: number; failed: number }> {
    return await this.knowledgeService.generateEmbeddings(user.id, dto);
  }

  @Get('embeddings/statistics')
  @ApiOperation({ summary: 'Get embedding generation statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: EmbeddingStatisticsDto,
  })
  async getEmbeddingStatistics(): Promise<EmbeddingStatisticsDto> {
    return await this.knowledgeService.getEmbeddingStatistics();
  }
}
