import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto';
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
  create(@CurrentUser() user: any, @Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(user.id, createAgentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agents for current user' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  findAll(@CurrentUser() user: any) {
    return this.agentsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent details' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agentsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agent' })
  @ApiResponse({ status: 200, description: 'Agent successfully updated' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, user.id, updateAgentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an agent' })
  @ApiResponse({ status: 200, description: 'Agent successfully deleted' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.agentsService.remove(id, user.id);
  }
}
