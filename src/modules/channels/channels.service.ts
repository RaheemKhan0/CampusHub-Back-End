// channels.service.ts
import { Injectable, ForbiddenException } from "@nestjs/common";
import { Channel } from "src/database/schemas/channel.schema";
import { ChannelAccess } from "src/database/schemas/channel-access.schema";
import { CreateChannelDto } from "./dto/create-channel.dto";

@Injectable()
export class ChannelsService {
  async create(serverId: string, dto: CreateChannelDto) {
    const channel = await Channel.create({
      serverId, name: dto.name, type: dto.type, privacy: dto.privacy
    });

    if (dto.privacy === "hidden" && dto.memberIds?.length) {
      const docs = dto.memberIds.map(userId => ({ channelId: channel._id, userId }));
      await ChannelAccess.bulkWrite(
        docs.map(d => ({ updateOne: { filter: { channelId: d.channelId, userId: d.userId }, update: { $setOnInsert: d }, upsert: true } }))
      );
    }
    return channel.toObject();
  }

  async addMember(channelId: string, userId: string) {
    await ChannelAccess.updateOne({ channelId, userId }, { $setOnInsert: { channelId, userId } }, { upsert: true });
    return { ok: true };
  }

  async removeMember(channelId: string, userId: string) {
    await ChannelAccess.deleteOne({ channelId, userId });
    return { ok: true };
  }

  // For building a sidebar: list channels the current user can see in a server
  async listVisible(serverId: string) {
    // Return both public channels and hidden ones the user has access to.
    // Implement with an aggregation in your real code (needs current userId from context).
    return Channel.find({ serverId }).lean();
  }
}

