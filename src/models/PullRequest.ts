import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from './User'; // Ensure User model exports IUser
import { IRepository } from './Repository'; // Ensure Repository model exports IRepository

// Interface representing a file in the PR
interface IPullRequestFile {
  filename: string;
  status: 'added' | 'modified' | 'removed';
}

// Interface for PullRequest document
export interface IPullRequest extends Document {
  title: string;
  status: 'open' | 'closed' | 'merged';
  url: string;
  provider: string;
  providerPrId: string;
  author: mongoose.Types.ObjectId | IUser;
  repository: mongoose.Types.ObjectId | IRepository;
  files: IPullRequestFile[];
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema
const pullRequestSchema: Schema<IPullRequest> = new Schema({
  title: { type: String, required: true },
  status: { type: String, required: true }, // open, closed, merged
  url: { type: String, required: true },
  provider: { type: String, required: true },
  providerPrId: { type: String, required: true },

  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  repository: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },

  files: [
    {
      filename: { type: String, required: true },
      status: { type: String,  required: true }, // added, modified, removed
    },
  ],

  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
});

// Mongoose model
const PullRequest: Model<IPullRequest> = mongoose.model<IPullRequest>(
  'PullRequest',
  pullRequestSchema
);

export default PullRequest;
