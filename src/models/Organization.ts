import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from './User'; // Make sure your User model exports IUser

// 1. Define a TypeScript interface for an Organization document
export interface IOrganization extends Document {
  name: string;
  provider: string; // e.g., 'github', 'gitlab'
  providerOrgId: string;
  members: mongoose.Types.ObjectId[] | IUser[]; // ObjectId references to User
  admins: mongoose.Types.ObjectId[] | IUser[];
}

// 2. Define the schema
const organizationSchema: Schema<IOrganization> = new Schema({
  name: { type: String, required: true },
  provider: { type: String, required: true },
  providerOrgId: { type: String, required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

// 3. Export the Mongoose model
const Organization: Model<IOrganization> = mongoose.model<IOrganization>(
  'Organization',
  organizationSchema
);

export default Organization;
