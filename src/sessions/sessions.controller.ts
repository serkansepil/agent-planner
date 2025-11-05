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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionStatus,
  PauseSessionDto,
  ResumeSessionDto,
  ExportSessionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // ==================== CRUD Operations ====================

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: any,
    @Body() createSessionDto: CreateSessionDto,
  ) {
    return this.sessionsService.create(user.id, createSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions for current user' })
  @ApiQuery({ name: 'workspaceId', required: false, description: 'Filter by workspace' })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Return all sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: SessionStatus,
  ) {
    return this.sessionsService.findAll(user.id, workspaceId, status);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Return active sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActiveSessions(@CurrentUser() user: any) {
    return this.sessionsService.getActiveSessions(user.id);
  }

  @Get('active/count')
  @ApiOperation({ summary: 'Get count of concurrent active sessions' })
  @ApiResponse({ status: 200, description: 'Return session count' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConcurrentCount(@CurrentUser() user: any) {
    const count = await this.sessionsService.getConcurrentSessionCount(user.id);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Return the session' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessionsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(id, user.id, updateSessionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessionsService.remove(id, user.id);
  }

  // ==================== Lifecycle Management ====================

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an active session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  @ApiResponse({ status: 400, description: 'Session cannot be ended' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  endSession(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessionsService.endSession(id, user.id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  @ApiResponse({ status: 400, description: 'Session cannot be paused' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  pauseSession(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() pauseDto: PauseSessionDto,
  ) {
    return this.sessionsService.pauseSession(id, user.id, pauseDto);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  @ApiResponse({ status: 400, description: 'Session cannot be resumed' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  resumeSession(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() resumeDto: ResumeSessionDto,
  ) {
    return this.sessionsService.resumeSession(id, user.id, resumeDto);
  }

  // ==================== Context Management ====================

  @Get(':id/context')
  @ApiOperation({ summary: 'Get session context' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Return session context' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getContext(@Param('id') id: string, @CurrentUser() user: any) {
    const context = await this.sessionsService.getSessionContext(id, user.id);
    return { sessionId: id, context };
  }

  @Post(':id/context')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update session context' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Context updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateContext(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { context: Record<string, any> },
  ) {
    await this.sessionsService.updateSessionContext(id, user.id, body.context);
    return { message: 'Context updated successfully' };
  }

  @Delete(':id/context')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear session context' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Context cleared successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearContext(@Param('id') id: string, @CurrentUser() user: any) {
    await this.sessionsService.clearSessionContext(id, user.id);
    return { message: 'Context cleared successfully' };
  }

  // ==================== Analytics ====================

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get session analytics' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Return session analytics' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAnalytics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessionsService.getSessionAnalytics(id, user.id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get session timeline' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Return session timeline' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTimeline(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessionsService.getSessionTimeline(id, user.id);
  }

  // ==================== Export ====================

  @Post(':id/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export session data' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session exported successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportSession(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() exportDto: ExportSessionDto,
  ) {
    const exportData = await this.sessionsService.exportSession(
      id,
      user.id,
      exportDto,
    );

    // If format is specified, return formatted string
    if (exportDto.format && exportDto.format !== 'json') {
      const formatted = await this.sessionsService.formatExport(
        exportData,
        exportDto.format,
      );
      return { format: exportDto.format, data: formatted };
    }

    return exportData;
  }

  // ==================== Replay ====================

  @Get(':id/replay')
  @ApiOperation({ summary: 'Get session replay data' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiQuery({ name: 'speed', required: false, description: 'Playback speed multiplier (default: 1.0)' })
  @ApiResponse({ status: 200, description: 'Return session replay data' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getReplay(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('speed') speed?: string,
  ) {
    const playbackSpeed = speed ? parseFloat(speed) : 1.0;
    return this.sessionsService.getSessionReplay(id, user.id, playbackSpeed);
  }
}
