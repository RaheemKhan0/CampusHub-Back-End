import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import { Channel } from "src/database/schemas/channel.schema";
import { Membership } from "src/database/schemas/membership.schema";

@Injectable()
export class ChannelManageGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const authUserId = (req as any)?.user?.id as string | undefined;
    if (!authUserId) throw new ForbiddenException("Unauthenticated");

    const channelId = (req.params as any)?.channelId || (req.body as any)?.channelId;
    if (!channelId) throw new NotFoundException("channelId missing");

    const channel = await Channel.findById(channelId);
    if (!channel) throw new NotFoundException("Channel not found");

    const m = await Membership.findOne({ serverId: channel.serverId, userId: authUserId, status: "active" })
      .select("roles");
    const allowed = !!m && (m.roles.includes("owner") || m.roles.includes("admin"));
    if (!allowed) throw new ForbiddenException("Only server owner/admin can manage channels");

    return true;
  }
}

