import mongoose, { Schema, Document, Model } from 'mongoose';
import { IOrganization } from './Organization';

// 1. Interface for provider accounts (e.g., GitHub, GitLab, Azure)
export interface IProviderAccount {
  provider: string;
  providerId: string;
  accessToken: string;
  refreshToken: string;
  profileData: Record<string, any>; // Can be any JSON object
}

// 2. Interface for the User document
export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  avatar: string;
  role: 'user' | 'admin' | 'superadmin';
  providerAccounts: IProviderAccount[];
  organizations: (mongoose.Types.ObjectId | IOrganization)[];
  createdAt: Date;
}

// 3. Schema for the nested provider accounts
const providerAccountSchema = new Schema<IProviderAccount>(
  {
    provider: { type: String, required: true },
    providerId: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    profileData: { type: Object, required: true },
  },
  { _id: false } // Prevent automatic _id for subdocs
);

// 4. Schema for the User
const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, required: true },
  avatar: { type: String, required: true },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  },
  providerAccounts: [providerAccountSchema],
  organizations: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 5. Export the model
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
