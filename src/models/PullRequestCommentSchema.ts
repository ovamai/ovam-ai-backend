import mongoose from 'mongoose';

const PullRequestCommentSchema = new mongoose.Schema({
  owner: {
    type: String,
    required: true,
  },
  repo: {
    type: String,
    required: true,
  },
  pull_number: {
    type: Number,
    required: true,
  },
  commit_id: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  start_line: {
    type: Number,
    required: false,
  },
  start_side: {
    type: String,
    enum: ['LEFT', 'RIGHT'],
    required: false,
  },
  line: {
    type: Number,
    required: false,
  },
  side: {
    type: String,
    enum: ['LEFT', 'RIGHT'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const PullRequestComment = mongoose.model(
  'PullRequestComment',
  PullRequestCommentSchema,
);

const PullRequestSchema = new mongoose.Schema({
  pr_Url: {
    type: String,
    required: true,
  },
  Id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  currentBranch: {
    type: String,
    required: true,
  },
  currentCommit: {
    type: String,
    required: true,
  },
  baseMain: {
    type: String,
    required: true,
  },
  baseCommit: {
    type: String,
    required: true,
  },
  loginName: {
    type: String,
    required: true,
  },
});

export const PullRequest = mongoose.model('PullRequest', PullRequestSchema);
