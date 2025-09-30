// channels.controller.ts
import { Controller, Post, Body, Param, Delete, UseGuards, Get } from "@nestjs/common";
import { AuthSessionGuard } from "src/lib/guards/auth-session.guard";
import { ChannelManageGuard } from "src/lib/guards/channel-manage-guard";
import { ChannelsService } from "./channels.service";
import { CreateChannelDto } from "./dto/create-channel.dto";


@Controller("servers/:serverId/channels")
@UseGuards(AuthSessionGuard)
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  // Create channel (only owner/admin; you can reuse ServerRolesGuard instead if you prefer)
  @Post()
  @UseGuards(ChannelManageGuard)
  createChannel(
    @Param("serverId") serverId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channels.create(serverId, dto);
  }

  // Add member to hidden channel
  @Post(":channelId/addmember")
  @UseGuards(ChannelManageGuard)
  addMember(
    @Param("channelId") channelId: string,
    @Body() body: { userId: string }
  ) {
    return this.channels.addMember(channelId, body.userId);
  }

  // Remove member
  @Delete(":channelId/members/:userId")
  @UseGuards(ChannelManageGuard)
  removeMember(@Param("channelId") channelId: string, @Param("userId") userId: string) {
    return this.channels.removeMember(channelId, userId);
  }

  // List channels visible to the current user in this server
  @Get("visible")
  listVisible(@Param("serverId") serverId: string) {
    return this.channels.listVisible(serverId);
  }
}

