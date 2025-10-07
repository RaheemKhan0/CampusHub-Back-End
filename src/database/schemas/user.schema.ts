import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string; // BA user Id
  email: string; // lowercased, unique
  name: string;
  emailVerified: boolean; // must be true to sign in
  isSuper : boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppUserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    name: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    isSuper: { type : Boolean, default : false, required : true},
  },
  { timestamps: true },
);
AppUserSchema.pre('save', function (next) {
  const email = this.email?.toLowerCase() || '';
  if (!/@city\.ac\.uk$/i.test(email)) {
    return next(new Error('Only @city.ac.uk emails are allowed.'));
  }
  next();
});

// Helpful compound index if you’ll often filter by verified users
AppUserSchema.index({ emailVerified: 1, email: 1 });

export const AppUser = mongoose.model<IUser>('AppUser', AppUserSchema);
