// channels.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthSessionGuard } from 'src/lib/guards/auth-session.guard';
import { ChannelManageGuard } from 'src/lib/guards/channel-manage-guard';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UserAuth } from 'src/lib/decorators/auth-user';

@Controller('servers/:serverId/channels')
@UseGuards(AuthSessionGuard)
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Post()
  @UseGuards(ChannelManageGuard)
  create(@Param('serverId') serverId: string, @Body() dto: CreateChannelDto) {
    return this.channels.create(serverId, dto);
  }

  @Get()
  list(
    @Param('serverId') serverId: string,
    @UserAuth() user: { id: string },
  ) {
    return this.channels.listVisible(user.id, serverId);
  }

  @Post(':channelId/members')
  @UseGuards(ChannelManageGuard)
  addMembers(
    @Param('channelId') channelId: string,
    @Body() body: { userId: string },
  ) {
    const ids = body.userId;
    return this.channels.addMember(channelId, ids);
  }

  @Delete(':channelId/members/:userId')
  @UseGuards(ChannelManageGuard)
  removeMember(
    @Param('channelId') channelId: string,
    @Param('userId') userId: string,
  ) {
    return this.channels.removeMember(channelId, userId);
  }
  /*
    @Patch(':channelId')
    @UseGuards(ChannelManageGuard)
    update(
      @Param('serverId') serverId: string,
      @Param('channelId') channelId: string,
      @Body() dto: UpdateChannelDto,
    ) {
      return this.channels.update(serverId, channelId, dto);
    }
    */
  /*
    @Patch(':channelId/position')
    @UseGuards(ChannelManageGuard)
    reorder(
      @Param('serverId') serverId: string,
      @Param('channelId') channelId: string,
      @Body() dto: { position: number },
    ) {
      return this.channels.reorder(serverId, channelId, dto.position);
    }
    */
}
