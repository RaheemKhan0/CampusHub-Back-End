import mongoose, { Schema, Types, Document } from "mongoose";

export interface IUser extends Document {
  email: string;              // lowercased, unique
  name: string;
  roles: string[];            // ["student", "admin"]
  emailVerified: boolean;     // must be true to sign in
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    name:  { type: String, required: true },
    roles: { type: [String], default: ["student"] },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Helpful compound index if you’ll often filter by verified users
UserSchema.index({ emailVerified: 1, email: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);

