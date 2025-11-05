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

  // Configuration Management

  @Patch(':id/configuration')
  @ApiOperation({ summary: 'Update agent configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateConfiguration(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() configUpdate: any,
  ) {
    return this.agentsService.updateConfiguration(id, user.id, configUpdate);
  }

  // Cloning

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Clone an existing agent' })
  @ApiResponse({ status: 201, description: 'Agent cloned successfully' })
  @ApiResponse({ status: 404, description: 'Source agent not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  cloneAgent(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() cloneDto: any,
  ) {
    return this.agentsService.clone(id, user.id, cloneDto);
  }

  // Versioning

  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new version of the agent' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createVersion(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() versionDto: any,
  ) {
    return this.agentsService.createVersion(id, user.id, versionDto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions of an agent' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getVersions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agentsService.getVersions(id, user.id);
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Get a specific version of an agent' })
  @ApiResponse({ status: 200, description: 'Version details' })
  @ApiResponse({ status: 404, description: 'Agent or version not found' })
  @ApiResponse({ status: 403, description: 'Access forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.getVersion(id, parseInt(version), user.id);
  }

  @Post(':id/versions/:version/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore agent to a specific version' })
  @ApiResponse({ status: 200, description: 'Version restored successfully' })
  @ApiResponse({ status: 404, description: 'Agent or version not found' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  restoreVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @CurrentUser() user: any,
    @Body() restoreDto: any,
  ) {
    return this.agentsService.restoreVersion(
      id,
      parseInt(version),
      user.id,
      restoreDto,
    );
  }

  // Templates

  @Get('templates/list')
  @ApiOperation({ summary: 'Get all available agent templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTemplates() {
    return this.agentsService.getTemplates();
  }

  @Post('templates/:templateId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create agent from template' })
  @ApiResponse({ status: 201, description: 'Agent created from template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createFromTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any,
    @Body() customization?: any,
  ) {
    return this.agentsService.createFromTemplate(
      user.id,
      templateId,
      customization,
    );
  }
}
