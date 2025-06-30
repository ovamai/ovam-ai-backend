const mongoose = require('mongoose');

const providerAccountSchema = new mongoose.Schema({
  provider: String, // e.g., github, gitlab, azure
  providerId: String, // unique ID from provider
  accessToken: String,
  refreshToken: String,
  profileData: Object
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  avatar: String,
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  providerAccounts: [providerAccountSchema],
  organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
