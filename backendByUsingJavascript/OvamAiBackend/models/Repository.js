const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema({
  name: String,
  fullName: String, // e.g., openai/whisper
  provider: String,
  providerRepoId: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdAtGitHub: Date,   // ✅ When the repo was created on GitHub
  updatedAtGitHub: Date,    // ✅ Last push/update on GitHub
  repoUrl: String
},
{
  timestamps: true         // ✅ Mongo will auto-store createdAt and updatedAt for local DB
}


);

module.exports = mongoose.model('Repository', repositorySchema);
