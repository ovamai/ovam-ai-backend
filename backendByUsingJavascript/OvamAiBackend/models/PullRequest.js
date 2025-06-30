const mongoose = require('mongoose');

const pullRequestSchema = new mongoose.Schema({
  title: String,
  status: String, // open, closed, merged
  url: String,
  provider: String,
  providerPrId: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  repository: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository' },

    files: [
        {
        filename: String,
        status: String // added, modified, removed
        }
    ],



  createdAt: Date,
  updatedAt: Date
});

module.exports = mongoose.model('PullRequest', pullRequestSchema);
