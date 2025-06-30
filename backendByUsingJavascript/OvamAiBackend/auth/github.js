
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const User = require('../models/User');
const Repository = require('../models/Repository');
const PullRequest = require('../models/PullRequest');
const { fetchUserRepos, fetchPullRequests,fetchPullRequestFiles } = require('../services/github');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/github/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Step 1: Get user profile data from GitHub API
    const { data } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!data || !data.id) return done(null, false);

    // Step 2: Check if user exists in DB
    let user = await User.findOne({ 'providerAccounts.provider': 'github', 'providerAccounts.providerId': data.id });

    // Step 3: Create new user or update provider info
    if (!user) {
      const userCount = await User.countDocuments();

      user = await User.create({
        name: data.name || data.login,
        email: profile.emails?.[0]?.value,
        username: data.login,
        avatar: data.avatar_url,
        role: userCount === 0 ? 'superadmin' : 'user',
        providerAccounts: [{
          provider: 'github',
          providerId: data.id,
          accessToken,
          refreshToken,
          profileData: data
        }]
      });
    } else {
      // Update GitHub account info
      const githubAccount = user.providerAccounts.find(p => p.provider === 'github');
      if (githubAccount) {
        githubAccount.accessToken = accessToken;
        githubAccount.refreshToken = refreshToken;
        githubAccount.profileData = data;
      } else {
        user.providerAccounts.push({
          provider: 'github',
          providerId: data.id,
          accessToken,
          refreshToken,
          profileData: data
        });
      }

      await user.save();
    }

    // ✅ Step 4: Fetch and store repositories
    const repos = await fetchUserRepos(accessToken);

    for (const repoData of repos) {
      let repo = await Repository.findOne({ providerRepoId: repoData.id });

      if (!repo) {
        repo = await Repository.create({
          name: repoData.name,
          fullName: repoData.full_name,
          provider: 'github',
          providerRepoId: repoData.id,
          organization: null, // You can update this later
          createdAtGitHub: repoData.created_at,
          updatedAtGitHub: repoData.updated_at,
          repoUrl: repoData.html_url // ✅ Save the GitHub repo URL
          
        });
      }
      else {
          repo.createdAtGitHub = repoData.created_at;
          repo.updatedAtGitHub = repoData.updated_at;
          repo.repoUrl = repoData.html_url; // ✅ Update in existing repo
          await repo.save();
        }









      // ✅ Step 5: Fetch and store PRs for the repo
      const [owner, repoName] = repoData.full_name.split('/');
      const prs = await fetchPullRequests(accessToken, owner, repoName);

      

for (const pr of prs) {
  const existingPR = await PullRequest.findOne({ providerPrId: pr.id });

  const filesChanged = await fetchPullRequestFiles(accessToken, owner, repoName, pr.number);
  const fileInfo = filesChanged.map(file => ({
    filename: file.filename,
    status: file.status
  }));

  if (!existingPR) {
    await PullRequest.create({
      title: pr.title,
      status: pr.state,
      url: pr.html_url,
      provider: 'github',
      providerPrId: pr.id,
      author: user._id,
      repository: repo._id,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      files: fileInfo // ✅ save files
    });
  } else {
    existingPR.files = fileInfo;
    existingPR.updatedAt = pr.updated_at;
    await existingPR.save();
  }
}




    }

    // ✅ Final step: Pass the user object to Passport
    return done(null, {
      ...user.toObject(),
      accessToken,
      provider: 'github'
    });

  } catch (err) {
    console.error('GitHub Auth Error:', err);
    return done(err);
  }
}));





