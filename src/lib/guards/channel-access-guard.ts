// channel-access.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Channel, IChannel } from 'src/database/schemas/channel.schema';
import { ChannelAccess } from 'src/database/schemas/channel-access.schema';
import { Membership } from 'src/database/schemas/membership.schema';
import { IServer, ServerModel } from 'src/database/schemas/server.schema';
import type { UserSession } from '@thallesp/nestjs-better-auth';

@Injectable()
export class ChannelAccessGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { session?: UserSession }>();
    const session = req.session;
    const userId = session?.user?.id;
    if (!userId) throw new ForbiddenException('Unauthenticated');

    const channelId = (req.params as any)?.channelId;
    if (!channelId) throw new NotFoundException('channelId missing');

    const channel = await Channel.findById(channelId).lean<IChannel>();
    if (!channel) throw new NotFoundException('Channel not found');

    const server = await ServerModel.findById(channel.serverId).lean<IServer>();

    if (server && server.type == 'unimodules') {
      return true;
    }

    // Public: must at least be a member of the server
    if (channel.privacy === 'public') {
      const m = await Membership.findOne({
        serverId: channel.serverId,
        userId,
        status: 'active',
      }).select('_id');
      if (!m) throw new ForbiddenException('Not a member of this server');
      return true;
    }

    // Hidden: allow server owner/admin or explicit channel access
    const m = await Membership.findOne({
      serverId: channel.serverId,
      userId,
      status: 'active',
    }).select('roles');
    const isServerAdmin =
      !!m && (m.roles.includes('owner') || m.roles.includes('admin'));
    if (isServerAdmin) return true;

    const access = await ChannelAccess.findOne({
      channelId: channel._id,
      userId,
    })
      .select('_id')
      .lean();
    if (!access) throw new ForbiddenException('No access to this channel');

    return true;
  }
}
