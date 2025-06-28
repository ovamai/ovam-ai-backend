const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  provider: String,
  providerId: String,
  name: String,
  email: String,
  avatar: String,
});

module.exports = mongoose.model("User", userSchema);
