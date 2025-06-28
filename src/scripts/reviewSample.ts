import { reviewPR } from '../services/reviewService';

async function main() {
  // Example: review PR #1 of octocat/Hello-World
  const owner = 'credmarg-simran';
  const repo = 'astro-node';
  const prNumber = 279;

  console.log(`Fetching & reviewing ${owner}/${repo}#${prNumber}...`);
  try {
    const review = await reviewPR(owner, repo, prNumber);
    console.log('\n=== GPT CODE REVIEW ===\n');
    console.log(review);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// main();
