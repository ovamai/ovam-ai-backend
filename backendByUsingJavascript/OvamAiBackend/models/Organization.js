const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: String,
  provider: String, // github, gitlab, etc.
  providerOrgId: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Organization', organizationSchema);
