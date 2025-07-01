import mongoose, { Schema, Document, Model } from 'mongoose';
import { IOrganization } from './Organization';

// 1. Define TypeScript interface for the Repository document
export interface IRepository extends Document {
  name: string;
  fullName: string; // e.g., openai/whisper
  provider: string;
  providerRepoId: string;
  organization: mongoose.Types.ObjectId | IOrganization | null;
  createdAtGitHub: Date;
  updatedAtGitHub: Date;
  repoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the Mongoose schema with fields and types
const repositorySchema: Schema<IRepository> = new Schema(
  {
    name: { type: String, required: true },
    fullName: { type: String, required: true }, // e.g., openai/whisper
    provider: { type: String, required: true }, // e.g., 'github'
    providerRepoId: { type: String, required: true },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    createdAtGitHub: { type: Date, required: true },
    updatedAtGitHub: { type: Date, required: true },
    repoUrl: { type: String, required: true },
  },
  {
    timestamps: true, // ✅ Automatically adds `createdAt` and `updatedAt`
  },
);

// 3. Export the model
const Repository: Model<IRepository> = mongoose.model<IRepository>(
  'Repository',
  repositorySchema,
);

export default Repository;
