import mongoose from 'mongoose';

const DateUpdated = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
});

const updatedAtIST = new Date(Date.parse(DateUpdated));

const PullRequestUpdateSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  baseBranch: {
    type: String,
    default: 'main',
  },
  currentBranch: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: updatedAtIST,
  },
});

export default mongoose.model('PullRequestUpdate', PullRequestUpdateSchema);
