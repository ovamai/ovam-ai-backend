import { getPullRequestDiff } from './githubService';
import { getCodeReview } from './chatGptService';

export async function reviewPR(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  const diff = await getPullRequestDiff(owner, repo, prNumber);
  return getCodeReview(diff);
}
