import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AuthSessionGuard } from 'src/lib/guards/auth-session.guard';
import { ServerRolesGuard } from 'src/lib/guards/server-role.guard';
import { ServerService } from './server.service';
import { UserAuth } from 'src/lib/decorators/auth-user';
import { CreateServerDto } from './dto/create-server.dto';
import { ServerRole } from 'src/lib/decorators/server-roles.decorator';
import { UpdateServerDto } from './dto/update-server.dto';

@Controller('server')
@UseGuards(AuthSessionGuard)
export class ServerController {
  constructor(private readonly servers: ServerService) {}

  @Post('create')
  async createServer(
    @UserAuth() user: { id: string; email: string },
    @Body() dto: CreateServerDto,
  ) {
    return this.servers.create(user.id, dto);
  }

  @Patch('update/:serverId')
  @UseGuards(ServerRolesGuard)
  @ServerRole('owner', 'admin')
  async update(
    @UserAuth() user: { id: string },
    @Param('serverId') serverId: string,
    @Body() dto: UpdateServerDto,
  ) {
    this.servers.update(serverId, user.id, dto)
  }
}
