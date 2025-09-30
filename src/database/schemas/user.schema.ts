import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IUser extends Document {
  email: string; // lowercased, unique
  name: string;
  emailVerified: boolean; // must be true to sign in
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    name: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);
UserSchema.pre('save', function(next) {
  const email = this.email?.toLowerCase() || '';
  if (!/@city\.ac\.uk$/i.test(email)) {
    return next(new Error('Only @city.ac.uk emails are allowed.'));
  }
  next();
});

// Helpful compound index if you’ll often filter by verified users
UserSchema.index({ emailVerified: 1, email: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
