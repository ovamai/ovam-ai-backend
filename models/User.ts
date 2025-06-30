import mongoose, { Document, Schema, Model } from "mongoose";

export interface IUser extends Document {
  provider: string;
  providerId: string;
  name: string;
  email: string;
  avatar?: string;
}

const userSchema = new Schema<IUser>({
  provider: { type: String, required: true },
  providerId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String },
});

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
