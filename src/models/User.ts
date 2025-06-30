import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  provider: string;
  providerId: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
}

const UserSchema: Schema = new Schema<IUser>({
  provider: { type: String, required: true },
  providerId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: false },
  username: { type: String, required: true },
  avatar: { type: String, required: false },
});

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
