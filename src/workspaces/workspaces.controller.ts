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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddAgentDto,
  UpdateWorkspaceAgentDto,
  CloneWorkspaceDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ==================== CRUD Operations ====================

  @Post()
  @ApiOperation({ summary: 'Create a new workspace with host agent' })
  @ApiResponse({
    status: 201,
    description: 'The workspace has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(
    @CurrentUser() user: any,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(user.id, createWorkspaceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for current user' })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'Include archived workspaces',
  })
  @ApiResponse({ status: 200, description: 'Return all workspaces.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(
    @CurrentUser() user: any,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.workspacesService.findAll(
      user.id,
      includeArchived === 'true',
    );
  }

  @Get('archived')
  @ApiOperation({ summary: 'Get all archived workspaces' })
  @ApiResponse({ status: 200, description: 'Return all archived workspaces.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getArchived(@CurrentUser() user: any) {
    return this.workspacesService.getArchivedWorkspaces(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Return the workspace.' })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'The workspace has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, user.id, updateWorkspaceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'The workspace has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.remove(id, user.id);
  }

  // ==================== Agent Management ====================

  @Get(':id/agents')
  @ApiOperation({ summary: 'Get all agents in workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Return all workspace agents.' })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getAgents(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.getWorkspaceAgents(id, user.id);
  }

  @Post(':id/agents')
  @ApiOperation({ summary: 'Add agent to workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({
    status: 201,
    description: 'The agent has been successfully added to workspace.',
  })
  @ApiResponse({ status: 404, description: 'Workspace or agent not found.' })
  @ApiResponse({ status: 409, description: 'Agent already in workspace.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  addAgent(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() addAgentDto: AddAgentDto,
  ) {
    return this.workspacesService.addAgent(id, user.id, addAgentDto);
  }

  @Patch(':workspaceId/agents/:agentId')
  @ApiOperation({ summary: 'Update agent role and settings in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'The workspace agent has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace or agent not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  updateAgent(
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateWorkspaceAgentDto,
  ) {
    return this.workspacesService.updateWorkspaceAgent(
      workspaceId,
      agentId,
      user.id,
      updateDto,
    );
  }

  @Delete(':workspaceId/agents/:agentId')
  @ApiOperation({ summary: 'Remove agent from workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'The agent has been successfully removed from workspace.',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace or agent not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  removeAgent(
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
  ) {
    return this.workspacesService.removeAgent(workspaceId, agentId, user.id);
  }

  // ==================== Templates ====================

  @Get('templates/list')
  @ApiOperation({ summary: 'Get all workspace templates' })
  @ApiResponse({ status: 200, description: 'Return all templates.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getTemplates() {
    return this.workspacesService.getTemplates();
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get workspace template by ID' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Return the template.' })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getTemplate(@Param('templateId') templateId: string) {
    return this.workspacesService.getTemplate(templateId);
  }

  @Post('templates/:templateId/create')
  @ApiOperation({ summary: 'Create workspace from template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({
    status: 201,
    description: 'The workspace has been successfully created from template.',
  })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createFromTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: any,
    @Body() body: { name: string; hostAgentId: string },
  ) {
    return this.workspacesService.createFromTemplate(
      user.id,
      templateId,
      body.name,
      body.hostAgentId,
    );
  }

  // ==================== Cloning ====================

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID to clone' })
  @ApiResponse({
    status: 201,
    description: 'The workspace has been successfully cloned.',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  cloneWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() cloneDto: CloneWorkspaceDto,
  ) {
    return this.workspacesService.cloneWorkspace(id, user.id, cloneDto);
  }

  // ==================== Archive/Restore ====================

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'The workspace has been successfully archived.',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.archiveWorkspace(id, user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore archived workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'The workspace has been successfully restored.',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.restoreWorkspace(id, user.id);
  }
}
