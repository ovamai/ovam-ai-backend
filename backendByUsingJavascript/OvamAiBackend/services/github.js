const axios = require('axios');

const githubAPI = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json'
  }
});

exports.fetchUserRepos = async (accessToken) => {
  const response = await githubAPI.get('/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
};


exports.fetchPullRequests = async (accessToken, owner, repo) => {
  const response = await githubAPI.get(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
};





exports.fetchPullRequestFiles = async (accessToken, owner, repo, pullNumber) => {
  const response = await githubAPI.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data; // each file: { filename, status, additions, deletions }
};

