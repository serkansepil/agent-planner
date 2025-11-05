import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  FilterAgentDto,
  PaginatedAgentResponseDto,
  AgentStatisticsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('agents')
@ApiBearerAuth('JWT-auth')
@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new AI agent' })
  @ApiResponse({ status: 201, description: 'Agent successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: any, @Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(user.id, createAgentDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all agents with pagination, filtering, and search',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of agents',
    type: PaginatedAgentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiQuery({ name: 'ownedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(
    @CurrentUser() user: any,
    @Query() filterDto: FilterAgentDto,
  ): Promise<PaginatedAgentResponseDto> {
    return this.agentsService.findAll(user.id, filterDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search agents by name or description' })
  @ApiResponse({
    status: 200,
    description: 'List of matching agents',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @CurrentUser() user: any,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.agentsService.search(user.id, query, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent details with counts' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agentsService.findOne(id, user.id);
  }

  @Get(':id/statistics')
  @ApiOperation({
    summary: 'Get agent statistics (usage count, success rate, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent statistics',
    type: AgentStatisticsDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStatistics(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<AgentStatisticsDto> {
    return this.agentsService.getStatistics(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agent (ownership required)' })
  @ApiResponse({ status: 200, description: 'Agent successfully updated' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Not the owner of this agent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, user.id, updateAgentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an agent (ownership required)' })
  @ApiResponse({ status: 200, description: 'Agent successfully soft-deleted' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Not the owner of this agent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agentsService.remove(id, user.id);
  }

  @Delete(':id/hard')
  @ApiOperation({
    summary: 'Permanently delete an agent (ownership required)',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent permanently deleted',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Not the owner of this agent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  hardDelete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agentsService.hardDelete(id, user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a soft-deleted agent (ownership required)',
  })
  @ApiResponse({ status: 200, description: 'Agent successfully restored' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Not the owner or not deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agentsService.restore(id, user.id);
  }
}
