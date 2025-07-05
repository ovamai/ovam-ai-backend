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
    console.log(`Updating PR #${pull_number} in ${owner}/${repo} with title: ${title}`);

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

// Assuming your existing imports in githubService.ts
// import { ReviewComment } from './githubService'; // Make sure ReviewComment is defined or imported

interface DiffHunk {
  file: string;
  startLine: number;
  endLine: number;
  hunkContent: string;
  // You might want to add other diff metadata here if helpful for AI, like old path/new path
  // oldPath: string;
  // newPath: string;
}

interface Chunk {
  file: string;
  startLine: number;
  endLine: number;
  chunkContent: string; // The content sent to OpenAI
}

export function parseAndSplitDiff(
  fullDiff: string,
  maxTokenLimit: number // A safer token limit per chunk for the combined prompt, adjust as needed for your model (e.g., 8K for gpt-3.5-turbo if you aim for 16K context, leaving space for prompt/output)
): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = fullDiff.split('\n');
  let currentFile = '';
  let currentHunk: DiffHunk | null = null;
  let fileContentLines: string[] = []; // Stores lines for the current file being processed

  // Regular expression to match diff file headers (e.g., "--- a/file", "+++ b/file")
  const fileHeaderRegex = /^(---|\+\+\+) (a|b)\/(.+)$/;
  // Regular expression to match diff hunk headers (e.g., "@@ -old_start,old_lines +new_start,new_lines @@")
  const hunkHeaderRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@.*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for file headers
    if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      const match = line.match(fileHeaderRegex);
      if (match) {
        // If we were processing a previous file, add it as a chunk if it's not empty
        if (currentFile && fileContentLines.length > 0) {
          addFileOrHunkChunks(currentFile, fileContentLines.join('\n'), chunks, maxTokenLimit);
        }
        currentFile = match[3]; // Extract the file path
        fileContentLines = []; // Reset for the new file
        currentHunk = null; // Reset hunk for the new file
        continue; // Skip to next line
      }
    }

    // Check for hunk headers
    const hunkMatch = line.match(hunkHeaderRegex);
    if (hunkMatch) {
      // If we were processing a previous hunk, add it as a chunk
      if (currentHunk && currentHunk.hunkContent) {
        addFileOrHunkChunks(currentHunk.file, currentHunk.hunkContent, chunks, maxTokenLimit);
      }
      // Start a new hunk
      const newStartLine = parseInt(hunkMatch[3], 10);
      const newLines = parseInt(hunkMatch[4] || '1', 10);
      currentHunk = {
        file: currentFile, // This assumes currentFile is correctly set by fileHeaderRegex
        startLine: newStartLine,
        endLine: newStartLine + newLines - 1,
        hunkContent: line + '\n', // Include the hunk header in the content
      };
      fileContentLines.push(line); // Also add to file content if we're building file-based chunks
    } else if (currentHunk) {
      // If we are inside a hunk, append line to hunk content
      currentHunk.hunkContent += line + '\n';
      fileContentLines.push(line); // Also add to file content
    } else if (currentFile) {
      // If we are outside a hunk but inside a file (e.g., context lines before first hunk)
      fileContentLines.push(line);
    }
  }

  // Add the last file/hunk as a chunk
  if (currentFile && fileContentLines.length > 0) {
    addFileOrHunkChunks(currentFile, fileContentLines.join('\n'), chunks, maxTokenLimit);
  } else if (currentHunk && currentHunk.hunkContent) {
     addFileOrHunkChunks(currentHunk.file, currentHunk.hunkContent, chunks, maxTokenLimit);
  } else if (fullDiff.trim().length > 0 && chunks.length === 0) {
      // Handle cases where diff might be too small to have clear file/hunk headers, but still has content
      addFileOrHunkChunks("unknown_file", fullDiff, chunks, maxTokenLimit);
  }

  return chunks;
}

// Helper function to add content as chunks, respecting maxTokenLimit
function addFileOrHunkChunks(
  file: string,
  content: string,
  chunks: Chunk[],
  maxTokenLimit: number
) {
  // Estimate tokens roughly (e.g., 1 token per 4 characters for English text)
  // You might want a more precise token counter for better accuracy
  const estimatedTokens = content.length / 4; 

  if (estimatedTokens <= maxTokenLimit) {
    chunks.push({
      file,
      startLine: 1, // Placeholder if actual start/end lines for the entire file are not easily determined
      endLine: content.split('\n').length, // Placeholder
      chunkContent: `FILE: ${file}\n${content}`,
    });
  } else {
    // If the file/hunk is too large, fall back to line-by-line splitting
    // This is a last resort to ensure content fits within limits.
    // The exact line numbering for these sub-hunk chunks might be less accurate.
    const lines = content.split('\n');
    let currentChunkLines: string[] = [];
    let currentChunkBytes = 0;
    let chunkStartLine = 1; // Assuming relative to the content block passed in

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineBytes = line.length + 1; // +1 for newline character

      // If adding the current line exceeds the limit, push the current chunk
      // and start a new one with the current line.
      if (currentChunkBytes + lineBytes > maxTokenLimit * 4 && currentChunkLines.length > 0) {
        chunks.push({
          file,
          startLine: chunkStartLine,
          endLine: chunkStartLine + currentChunkLines.length - 1,
          chunkContent: `FILE: ${file}\n${currentChunkLines.join('\n')}`,
        });
        currentChunkLines = [];
        currentChunkBytes = 0;
        chunkStartLine = i + 1; // Update start line for the new chunk
      }

      currentChunkLines.push(line);
      currentChunkBytes += lineBytes;
    }

    // Push any remaining lines as the last chunk
    if (currentChunkLines.length > 0) {
      chunks.push({
        file,
        startLine: chunkStartLine,
        endLine: chunkStartLine + currentChunkLines.length - 1,
        chunkContent: `FILE: ${file}\n${currentChunkLines.join('\n')}`,
      });
    }
  }
}

// Hierarchical safe merge to handle huge combined inputs.
export async function hierarchicalMerge(
  summaries: string[],
  mergeFn: (mergedText: string) => Promise<string>,
  maxPerBatch: number = 10
): Promise<string> {
  // Base case: If summaries are within the batch limit, merge them directly
  if (summaries.length <= maxPerBatch) {
    return await mergeFn(summaries.join('\n\n'));
  }

  const batchPromises: Promise<string>[] = [];
  for (let i = 0; i < summaries.length; i += maxPerBatch) {
    const batch = summaries.slice(i, i + maxPerBatch);
    // Create a promise for each batch merge and add it to the array
    batchPromises.push(mergeFn(batch.join('\n\n')));
  }

  // Execute all batch merges in parallel
  const mergedBatchesResults = await Promise.all(batchPromises);

  // Recursively call hierarchicalMerge on the results of the merged batches
  // This ensures that subsequent levels of merging are also parallelized
  return await hierarchicalMerge(mergedBatchesResults, mergeFn, maxPerBatch);
}

