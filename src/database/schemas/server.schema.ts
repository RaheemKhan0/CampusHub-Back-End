import mongoose, { type Model, Schema, Document, Types } from 'mongoose';
import { ServerType, ServerTypes } from '../types';

export interface IServer extends Document {
  name: string;
  degreeModule: Types.ObjectId;
  degreeId: Types.ObjectId;
  slug: string; // globally unique (single-tenant)
  ownerId?: string; // BetterAuth user id, optional for system-owned servers
  icon?: string;
  createdAt: Date;
  type: ServerType;
  updatedAt: Date;
}

const ServerSchema = new Schema<IServer>(
  {
    name: { type: String, required: true, trim: true },
    degreeModule: { type: Schema.Types.ObjectId, required: true, unique: true },
    degreeId: { type: Schema.Types.ObjectId, required: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    ownerId: { type: String, required: false, index: true },
    icon: { type: String },
    type: {
      type: String,
      enum: ServerTypes as unknown as string[],
      required: true,
    },
  },
  { timestamps: true, versionKey: false, collection: 'servers' },
);
ServerSchema.index(
  { name: 'text', description: 'text' },
  {
    weights: { name: 10, description: 2 },
    name: 'ServerTextIndex',
    default_language: 'english',
  },
);
ServerSchema.index(
  { degreeModule: 1 },
  { unique: true, name: 'degreeModule_idx' },
);
ServerSchema.index({ degreeId: 1 }, { name: 'degreeId_idx' });

const existingServerModel = mongoose.models.Server as
  | Model<IServer>
  | undefined;
export const ServerModel: Model<IServer> =
  existingServerModel ?? mongoose.model<IServer>('Server', ServerSchema);
