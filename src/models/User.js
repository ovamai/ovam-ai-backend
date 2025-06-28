const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  provider: String,
  providerId: String,
  name: String,
  email: String,
  username: String,
  avatar: String,
});

module.exports = mongoose.model('User', UserSchema);
