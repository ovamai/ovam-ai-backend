const express = require('express');
const router = express.Router();
const PullRequest = require('../models/PullRequest');

router.get('/pull-requests', async (req, res) => {
  try {
    const pullRequests = await PullRequest.find()
      .populate('author', 'username avatar') // only selected fields
      .populate('repository', 'name fullName');

    res.json(pullRequests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

module.exports = router;
