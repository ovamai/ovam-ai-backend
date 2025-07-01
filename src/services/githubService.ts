import fetch from 'node-fetch';
import { generateJWT } from '../utils/github_verify_signature';
import { GITHUB_TOKEN } from '../config';
import {
  getPrCodeReviewComments,
  getPrSummary,
  getPrWalkthrough,
} from './chatGptService';

interface PostReviewOpts {
  owner: string;
  repo: string;
  prNumber: number;
  body: string;
  token: string;
}

export async function getPullRequestDiff(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.diff',
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
  return res.text();
}

export async function getInstallationTokenHelperFun(
  installationId: number,
): Promise<string> {
  const jwtToken = generateJWT();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `Failed to get installation token: ${response.status} - ${response.statusText} - ${errBody}`,
    );
  }

  const data = await response.json();
  return data.token;
}

// Example: Fetch PR diff using GitHub API
export async function fetchPRDiff(
  owner: string,
  repo: string,
  pull_number: number,
  token: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3.diff',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PR diff: ${response.status} - ${response.statusText}`,
    );
  }
  const diffText = await response.text();
  // console.log(`Diff content: ${diff?.diff_url}...`);
  // console.log(`Diff content: ${diffText}`);
  console.log(`Diff content: ${diffText}`);

  let prSummary = await getPrSummary(diffText);
  console.log(`PR Summary: ${prSummary}`);

  let prWalkthrough = await getPrWalkthrough(diffText);
  console.log(`PR Walkthrough: ${prWalkthrough}`);

  let prCodeReviewComments = await getPrCodeReviewComments(diffText);
  console.log(`PR Code Review Comments: ${prCodeReviewComments}`);

  return diffText;
}

export async function postReview(opts: PostReviewOpts) {
  const url = `https://api.github.com/repos/${opts.owner}/${opts.repo}/pulls/${opts.prNumber}/reviews`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${opts.token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ body: opts.body, event: 'COMMENT' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub review failed: ${res.status} ${err}`);
  }
}
