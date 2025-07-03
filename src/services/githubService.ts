import fetch from 'node-fetch';
import { generateJWT } from '../utils/github_verify_signature';
import { GITHUB_TOKEN } from '../config';
// import { saveCommentToMongoDB } from '../services/reviewCommentService';
import {
  getPrCodeReviewComments,
  getPrSummary,
  getPrWalkthrough,
} from './chatGptService';
import PullRequestUpdate from '../models/PullRequestUpdate';

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

export async function updatePullRequest(
  owner: string,
  repo: string,
  pull_number: number,
  title: string,
  body: string,
  baseBranch: string = 'main',
  installationToken: string,
): Promise<void> {

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`;

  const payload = {
    title,
    body,
    state: 'open',
    base: baseBranch,
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${installationToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }

    const data = await response.json();

    const DateUpdated = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    });

    const currentBranch = data.head.ref;

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

  } catch (error) {
    console.error('Failed to update PR:', error);
  }
}

export function toTitleCase(str: string): string {
  return str
    ?.replace(/([A-Z])/g, ' $1') // Add space before capital letters (e.g., "bugFixes" → "bug Fixes")
    ?.replace(/^./, s => s.toUpperCase()) // Capitalize first letter
    ?.replace(/\b\w/g, c => c.toUpperCase()); // Capitalize each word
}

export function generateSummaryFromDynamicJson(
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

export async function postPRComment(
  owner: string,
  repo: string,
  prNumber: number,
  prWalkthrough: {
    walkthrough: string;
    changes: string;
    sequence_diagrams: string;
  },
) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
  const comment = `
## 🔍 PR Walkthrough
${prWalkthrough.walkthrough}

## 📑 Change Summary
${prWalkthrough.changes}

## 🔗 Sequence Diagram
${prWalkthrough.sequence_diagrams}
`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: comment }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Failed to post walkthrough comment:', error);
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Comment posted successfully:', data.html_url);
  return data;
}

export interface ReviewComment {
  file: string;
  start_line: number;
  end_line: number;
  line: number;
  side: string;
  start_side: string;
  severity: string;
  category: string;
  title: string;
  comment: string;
  suggestion: string;
  code_diff: string;
}

export async function addingComments(
  owner: string,
  repo: string,
  pull_number: number,
  commitId: string,
  data: ReviewComment[],
) {
  for (const comment of data) {
    const message = `
### 🔍 ${comment.title}
🔢 Comment on line: ${comment.start_line} to ${comment.line} 
⚠️ **Severity**: ${comment.severity}
🛠️ **Category**: ${comment.category}

💬 ${comment.comment}

💡 **Suggestion**: ${comment.suggestion}

\`\`\`diff
${comment?.code_diff?.replace(/^diff\n/, '')}
\`\`\`
    `.trim();

    try {
      const githubResponse = await postPRCommentReview(
        owner,
        repo,
        pull_number,
        message,
        commitId,
        comment.file,
        comment.start_line,
        comment.line,
      );

      // await saveCommentToMongoDB({
      //   ...comment,
      //   end_line:comment.line,
      //   commentId: githubResponse.id,
      //   githubUrl: githubResponse.html_url,
      //   prNumber:pull_number,
      //   createdAt: new Date(),
      //   updatedAt: new Date()
      // });
      console.log('✅ Comment posted');
    } catch (err) {
      console.error('❌ Failed to post review comment:', err);
    }
  }
}

export async function postPRCommentReview(
  owner: string,
  repo: string,
  prNumber: number,
  message: string,
  commitId: string,
  path: string,
  startLine: number,
  endLine: number,
): Promise<any> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
  const isMultiLine = startLine !== endLine;
  // Ensure start_line < end_line for multi-line comments
  const actualStartLine = Math.min(startLine, endLine);
  const actualEndLine = Math.max(startLine, endLine);

  const bodyPayload: any = {
    body: message,
    commit_id: commitId,
    path,
    side: 'RIGHT',
  };

  if (isMultiLine) {
    bodyPayload.start_line = actualStartLine;
    bodyPayload.start_side = 'RIGHT';
    bodyPayload.line = actualEndLine; // Note: key is 'line' not 'end_line'
  } else {
    bodyPayload.line = actualStartLine;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorDetails = {
      status: response.status,
      message: data.message,
      errors: data.errors, // GitHub provides specific validation errors
    };
    throw new Error(`GitHub API Error: ${JSON.stringify(errorDetails)}`);
  }
  return data;
}

interface DiffChunk {
  file: string;
  startLine: number;
  endLine: number;
  chunkContent: string;
}

interface FunctionHunk {
  file: string;
  functionName: string;
  hunks: string[];
  startLine: number;
  endLine: number;
}

export function parseAndSplitDiff(diffText: string, maxBytes: number): DiffChunk[] {
  const lines = diffText.split('\n');

  const functionHunks: FunctionHunk[] = [];

  let currentFile = '';
  let currentFunction = '';
  let currentHunkLines: string[] = [];
  let hunkStartLine = 0;
  let hunkEndLine = 0;

  const flushHunk = () => {
    if (currentFile && currentHunkLines.length > 0) {
      functionHunks.push({
        file: currentFile,
        functionName: currentFunction || 'UNKNOWN_FUNCTION',
        hunks: [...currentHunkLines],
        startLine: hunkStartLine,
        endLine: hunkEndLine,
      });
    }
    currentHunkLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      flushHunk();
      const match = line.match(/b\/(.+)$/);
      currentFile = match ? match[1] : '';
      currentFunction = '';
    }

    if (line.startsWith('@@')) {
      flushHunk();
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@(.*)/);
      if (match) {
        hunkStartLine = parseInt(match[1], 10);
        const lineCount = match[2] ? parseInt(match[2], 10) : 1;
        hunkEndLine = hunkStartLine + lineCount - 1;
        currentFunction = match[3].trim() || 'UNKNOWN_FUNCTION';
      }
    }

    if (
      currentFile &&
      (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line.startsWith('@@'))
    ) {
      currentHunkLines.push(line);
    }
  }

  flushHunk();

  // Group hunks by (file + function)
  const grouped: Record<string, FunctionHunk[]> = {};

  for (const fh of functionHunks) {
    const key = `${fh.file}::${fh.functionName}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(fh);
  }

  // Now pack into chunks, maxBytes each
  const result: DiffChunk[] = [];
  let currentChunk: string[] = [];
  let currentBytes = 0;
  let chunkFile = '';
  let chunkStart = 0;
  let chunkEnd = 0;

  for (const [key, hunks] of Object.entries(grouped)) {
    const file = hunks[0].file;
    const startLine = hunks[0].startLine;
    const endLine = hunks[hunks.length - 1].endLine;
    const content = hunks.flatMap(h => h.hunks).join('\n');
    const contentBytes = Buffer.byteLength(content, 'utf-8');

    if (
      currentBytes + contentBytes > maxBytes &&
      currentChunk.length > 0
    ) {
      // flush
      result.push({
        file: chunkFile,
        startLine: chunkStart,
        endLine: chunkEnd,
        chunkContent: currentChunk.join('\n'),
      });
      currentChunk = [];
      currentBytes = 0;
    }

    if (currentChunk.length === 0) {
      chunkFile = file;
      chunkStart = startLine;
    }

    currentChunk.push(content);
    currentBytes += contentBytes;
    chunkEnd = endLine;
  }

  if (currentChunk.length > 0) {
    result.push({
      file: chunkFile,
      startLine: chunkStart,
      endLine: chunkEnd,
      chunkContent: currentChunk.join('\n'),
    });
  }

  return result;
}
