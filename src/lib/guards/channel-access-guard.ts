// channel-access.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Channel } from 'src/database/schemas/channel.schema';
import { ChannelAccess } from 'src/database/schemas/channel-access.schema';
import { Membership } from 'src/database/schemas/membership.schema';

@Injectable()
export class ChannelAccessGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const authUserId = (req as any)?.user?.id as string | undefined;
    if (!authUserId) throw new ForbiddenException('Unauthenticated');

    const channelId = (req.params as any)?.channelId;
    if (!channelId) throw new NotFoundException('channelId missing');

    const channel = await Channel.findById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');

    // Public: must at least be a member of the server
    if (channel.privacy === 'public') {
      const m = await Membership.findOne({
        serverId: channel.serverId,
        userId: authUserId,
        status: 'active',
      }).select('_id');
      if (!m) throw new ForbiddenException('Not a member of this server');
      return true;
    }

    // Hidden: allow server owner/admin or explicit channel access
    const m = await Membership.findOne({
      serverId: channel.serverId,
      userId: authUserId,
      status: 'active',
    }).select('roles');
    const isServerAdmin =
      !!m && (m.roles.includes('owner') || m.roles.includes('admin'));
    if (isServerAdmin) return true;

    const access = await ChannelAccess.findOne({
      channelId: channel._id,
      userId: authUserId,
    })
      .select('_id')
      .lean();
    if (!access) throw new ForbiddenException('No access to this channel');

    return true;
  }
}
