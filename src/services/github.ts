import axios, { AxiosInstance } from 'axios';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Allow other properties
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface GitHubPRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  [key: string]: any;
}

// Create reusable GitHub API instance
const githubAPI: AxiosInstance = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
  },
});

// Fetch authenticated user's repositories
export async function fetchUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const response = await githubAPI.get('/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

// Fetch pull requests for a specific repo
export async function fetchPullRequests(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubPullRequest[]> {
  const response = await githubAPI.get(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

// Fetch files changed in a specific pull request
export async function fetchPullRequestFiles(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GitHubPRFile[]> {
  const response = await githubAPI.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}
