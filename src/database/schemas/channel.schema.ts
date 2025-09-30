// channels.schema.ts
import { Schema, Types, Document, model, models } from 'mongoose';
import { ChannelType, ChannelTypes } from 'src/database/types';

export interface IChannel extends Document {
  serverId: Types.ObjectId;
  name: string;
  type: ChannelType; // 'text' | 'qa'
  position: number; // ordering within the server
  privacy: 'public' | 'hidden';
  createdAt?: Date;
  updatedAt?: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    serverId: {
      type: Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ChannelTypes as unknown as string[],
      required: true,
    },
    position: { type: Number, default: 0 },
    privacy: {
      type: String,
      enum: ['public', 'hidden'],
      default: 'public',
      required: true,
    },
  },
  { timestamps: true, versionKey: false, collection: 'channels' },
);

ChannelSchema.index({ serverId: 1, position: 1 });
ChannelSchema.index({ serverId: 1, name: 1 }, { unique: true }); // optional uniqueness per server

export const Channel =
  models.Channel || model<IChannel>('Channel', ChannelSchema);
