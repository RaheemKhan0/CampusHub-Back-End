// channels.service.ts
import { Injectable } from '@nestjs/common';
import { Channel } from 'src/database/schemas/channel.schema';
import { ChannelAccess } from 'src/database/schemas/channel-access.schema';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelViewDto } from './dto/channel-view.dto';
import { Types } from 'mongoose';

@Injectable()
export class ChannelsService {
  async create(serverId: string, dto: CreateChannelDto) {
    const channel = await Channel.create({
      serverId,
      name: dto.name,
      type: dto.type,
      privacy: dto.privacy,
    });

    if (dto.privacy === 'hidden' && dto.memberIds?.length) {
      const docs = dto.memberIds.map((userId) => ({
        channelId: channel._id,
        userId,
      }));
      await ChannelAccess.bulkWrite(
        docs.map((d) => ({
          updateOne: {
            filter: { channelId: d.channelId, userId: d.userId },
            update: { $setOnInsert: d },
            upsert: true,
          },
        })),
      );
    }
    return channel.toObject();
  }

  async addMember(channelId: string, userId: string) {
    await ChannelAccess.updateOne(
      { channelId, userId },
      { $setOnInsert: { channelId, userId } },
      { upsert: true },
    );
    return { ok: true };
  }

  async removeMember(channelId: string, userId: string) {
    await ChannelAccess.deleteOne({ channelId, userId });
    return { ok: true };
  }

  toChannelView(doc: any): ChannelViewDto {
    return {
      id: String(doc._id),
      serverId: String(doc.serverId),
      name: doc.name,
      type: doc.type as any,
      position: doc.position ?? 0,
      privacy: doc.privacy as any,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }

  // For building a sidebar: list channels the current user can see in a server
  async listVisible(userId: string, serverId: string) {
    const sId = new Types.ObjectId(serverId);

    // kick off in parallel
    const publicQ = Channel.find({ serverId: sId, privacy: 'public' })
      .sort({ position: 1, createdAt: -1 })
      .lean()
      .exec();

    const accessQ = ChannelAccess.find({ userId })
      .select('channelId')
      .lean()
      .exec();

    const [publicDocs, accessDocs] = await Promise.all([publicQ, accessQ]);

    const channelIds = accessDocs.map((d) => d.channelId);
    const privateDocs = channelIds.length
      ? await Channel.find({
          _id: { $in: channelIds },
          serverId: sId,
          privacy: 'hidden',
        })
          .sort({ position: 1, createdAt: -1 })
          .lean()
          .exec()
      : [];

    const publicChannels = publicDocs.map(this.toChannelView);
    const privateChannels = privateDocs.map(this.toChannelView);

    return {
      publicChannels,
      privateChannels,
      total: publicChannels.length + privateChannels.length,
      page: 1,
      pageSize: publicChannels.length + privateChannels.length, // no paging in this endpoint
    };
  }
}
