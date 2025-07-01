import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import connectDB from '../config/db';

import { Octokit } from '@octokit/core';
import { generateJWT } from '../utils/github_verify_signature';
import { GITHUB_TOKEN } from '../config';
import {
  getPrCodeReviewComments,
  getPrSummary,
  getPrWalkthrough,
} from './chatGptService';
import PullRequestUpdate from '../models/PullRequestUpdate';

dotenv.config();
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

/**
 * Updates the PR body by generating a summary using the diff and OvamAi.
 */

export async function updatePullRequest(
  owner: string,
  repo: string,
  pull_number: number,
  title: string,
  body: string,
  baseBranch: string = 'main',
): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN }); // ✅ fixed

  try {
    const response = await octokit.request(
      'PATCH /repos/{owner}/{repo}/pulls/{pull_number}',
      {
        owner,
        repo,
        pull_number,
        title,
        body,
        state: 'open',
        baseBranch,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    const DateUpdated = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    });

    const currentBranch = response.data.head.ref; // 👈 extract current branch (head)

    console.log(DateUpdated);
    const updateFields = {
      title,
      body,
      baseBranch,
      currentBranch,
      updatedAt: DateUpdated,
    };

    await PullRequestUpdate.findOneAndUpdate(
      { owner, repo, pull_number },
      { $set: updateFields },
      { upsert: true, new: true },
    );
    console.log('updated data');
    console.log(' PR updated:', response.status);
  } catch (error) {
    console.error(' Failed to update PR:', error);
  }
}

function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters (e.g., "bugFixes" → "bug Fixes")
    .replace(/^./, s => s.toUpperCase()) // Capitalize first letter
    .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize each word
}

function generateSummaryFromDynamicJson(
  data: Record<string, string[]>,
): string {
  let summary = `## Summary by OvamAI\n\n`;

  for (const key in data) {
    const items = data[key];
    if (Array.isArray(items) && items.length > 0) {
      const sectionTitle = toTitleCase(key);
      summary += `#### ${sectionTitle}\n`;
      for (const item of items) {
        summary += `- ${item}\n`;
      }
      summary += `\n`;
    }
  }

  return summary.trim();
}

async function run() {
  const jsonSummary = {
    newFeatures: ['Added .gitignore file.', 'Added photo-4.png to assets.'],
    improvements: [],
    codeRefactors: ["made good changes"],
    performanceBoosts: ['Reduced image load times by 40%.'],
  };

  const body = generateSummaryFromDynamicJson(jsonSummary);
  await connectDB();
  await updatePullRequest(
    'credmarg-simran', // owner
    'app.ovam', // repo name
    2, // PR number
    'ovam Title', // title
    `${body}`, // body
  );
}

run().catch(console.error);
