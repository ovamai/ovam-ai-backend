import { getPullRequestDiff, postReview } from './githubService';
import { getCodeReview, reviewWithAI } from './chatGptService';
import { chunkDiff } from '../utils/diffUtils';

interface PRContext {
  owner: string;
  repo: string;
  prNumber: number;
  diff: string;
  installationToken: string;
}

export async function reviewPR(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  const diff = await getPullRequestDiff(owner, repo, prNumber);
  return getCodeReview(diff);
}

export async function handlePullRequest(ctx: PRContext) {
  // 1. Chunk the diff
  const chunks = chunkDiff(ctx.diff);

  // 2. For each chunk, build prompt + call AI
  const reviews = await Promise.all(
    chunks.map(async (chunk, idx) => {
      const prompt = `
You are Ovamai, an expert code reviewer.
Review the following diff hunk (#${idx + 1}/${chunks.length}):

\`\`\`diff
${chunk}
\`\`\`

Give me actionable comments in markdown.
`;
      return reviewWithAI(prompt);
    }),
  );

  // 3. Aggregate into one markdown body
  const fullReviewBody = reviews
    .map((r, i) => `### Review chunk ${i + 1}\n${r}`)
    .join('\n\n---\n\n');

  // 4. Post it back to GitHub
  await postReview({
    owner: ctx.owner,
    repo: ctx.repo,
    prNumber: ctx.prNumber,
    body: fullReviewBody,
    token: ctx.installationToken,
  });
}
