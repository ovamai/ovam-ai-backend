import { Request, Response } from 'express';
import { handlePullRequest, reviewPR } from '../services/reviewService';
import {
  addingComments,
  fetchPRDiff,
  generateSummaryFromDynamicJson,
  getInstallationTokenHelperFun,
  hierarchicalMerge,
  parseAndSplitDiff,
  postPRComment,
  ReviewComment,
  updatePullRequest,
} from '../services/githubService';
import { verifySignature } from '../utils/github_verify_signature';
import { getOverAllPrReviewComments, getOverAllPrSummary, getOverAllPrWalkthrough, getPrCodeReviewComments, getPrSummary, getPrWalkthrough, getUnifiedPRAnalysisPrompt } from '../services/chatGptService';

export async function getInstallationToken(req: Request, res: Response) {
  const { installationId } = req.body;
  if (!installationId) {
    return res.status(400).json({ error: 'installationId is required' });
  }
  try {
    const review = await getInstallationTokenHelperFun(installationId);
    res.json({ review });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function webhookCall(req: Request, res: Response) {
  try {
    if (!verifySignature(req)) {
      console.warn('⚠️ Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = req.headers['x-github-event'];
    if (!event) {
      return res.status(400).send('Missing event header');
    }

    const payload = req.body;
    if (event === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request;
      const repo = payload.repository;
      const installation = payload.installation;

      if (!pr || !repo || !installation) {
        return res.status(400).send('Invalid payload structure');
      }

      if (
        action === 'opened' ||
        action === 'synchronize' ||
        action === 'reopened'
      ) {
        const installationToken = await getInstallationTokenHelperFun(
          installation.id,
        );

        const [owner, repoName] = repo.full_name.split('/');
        const commit_id = pr?.head?.sha;
        const pull_number = pr?.number;

        const diff = await fetchPRDiff(
          owner,
          repoName,
          pull_number,
          installationToken,
        );

        console.log(`Fetched diff for PR #${pull_number} in ${repoName}:`, diff?.length);

        if (diff?.length > 25000) {
          const chunkedData = parseAndSplitDiff(diff, 20000);
          console.log(`Parsed diff into ${chunkedData.length} chunks`);

          const prSummaries: string[] = [];
          const prWalkthroughs: string[] = [];
          const allReviewComments: ReviewComment[] = [];

          let count = 0;

          const chunkReviewPromises = chunkedData.map(async (chunk) => {
            // Call the new function that sends the single combined prompt to OpenAI
            try {
              const combinedResponseJsonString = await getUnifiedPRAnalysisPrompt(chunk.chunkContent);
              console.log(`Combined response for chunk ${count}: ${combinedResponseJsonString}...`); // Log first 200 chars for brevity
              count++;
              // This is the critical line where JSON parsing might fail
              return JSON.parse(combinedResponseJsonString);
            } catch (error: any) {
              // Log the specific error for the failing chunk
              console.error(
                `❌ Error processing chunk ${count} (file: ${chunk.file}, lines: ${chunk.startLine}-${chunk.endLine}):`,
                error.message || error,
              );
              // It's important to return a resolved promise even on error
              // so that Promise.all does not immediately reject.
              // This allows Promise.all to complete and you can filter out failed results.
              // Returning a specific error object will help you identify which chunks failed.
              return { error: true, message: error.message || 'Unknown error during chunk processing' };
            }
          });

          // Wait for all combined review calls for all chunks to complete in parallel
          try {
            const allCombinedResults = await Promise.all(chunkReviewPromises);
            console.log(`All combined results received for ${allCombinedResults.length} chunks`);

            // Process the results from each chunk
            for (const result of allCombinedResults) {
              if (result.summary) {
                prSummaries.push(JSON.stringify(result.summary)); // Store summary as string for hierarchical merge if needed
              }
              if (result.walkthrough) {
                prWalkthroughs.push(JSON.stringify(result.walkthrough)); // Store walkthrough as string for hierarchical merge if needed
              }
              if (result.codeReviewComments && Array.isArray(result.codeReviewComments)) {
                allReviewComments.push(...result.codeReviewComments);
              } else {
                console.warn('⚠️ codeReviewComments not found or not an array in combined response for a chunk.');
              }
            }
            console.log(`prSummaries: ${prSummaries}`);
            console.log(`prWalkthroughs: ${prWalkthroughs}`);
            console.log(`allReviewComments: ${allReviewComments}`);

            const finalPrSummaryRaw = await hierarchicalMerge(prSummaries, getOverAllPrSummary);
            const cleanPrSummary = generateSummaryFromDynamicJson(JSON.parse(finalPrSummaryRaw));
            console.log('Final PR Summary:', cleanPrSummary);

            const finalPrWalkthroughRaw = await hierarchicalMerge(prWalkthroughs, getOverAllPrWalkthrough);
            const finalPrWalkthrough = JSON.parse(finalPrWalkthroughRaw);
            console.log('Final PR Walkthrough:', finalPrWalkthrough);

            await updatePullRequest(owner, repoName, pull_number, pr?.title, cleanPrSummary, pr?.base?.ref, installationToken);
            await postPRComment(owner, repoName, pull_number, finalPrWalkthrough);
            await addingComments(owner, repoName, pull_number, commit_id, allReviewComments);
            
            return res.status(200).send('PR processed successfully (chunked)');
          } catch (error) {
            console.error('❌ Error processing chunked PR:', error);
            return res.status(500).send('Error processing chunked PR');
          }
        }

        // let result = await getUnifiedPRAnalysisPrompt(diff);
        // console.log('Unified PR Analysis Result:', result);
        const [prSummaryRaw, prWalkthroughRaw, prCodeReviewComments] = await Promise.all([
          getPrSummary(`FILE: FullPR\n${diff}`),
          getPrWalkthrough(`FILE: FullPR\n${diff}`),
          getPrCodeReviewComments(`FILE: FullPR\n${diff}`)
        ]);

        const cleanPrSummary = generateSummaryFromDynamicJson(JSON.parse(prSummaryRaw));
        const prWalkthrough = JSON.parse(prWalkthroughRaw);
        const parsedComments: ReviewComment[] = JSON.parse(prCodeReviewComments);

        await updatePullRequest(owner, repoName, pull_number, pr?.title, cleanPrSummary, pr?.base?.ref, installationToken);
        await postPRComment(owner, repoName, pull_number, prWalkthrough);
        await addingComments(owner, repoName, pull_number, commit_id, parsedComments);

        return res.status(200).send('PR processed successfully (single)');
      }
    }

    res.status(200).send('Event received');
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
}

export async function pullRequestWebhook(req: Request, res: Response) {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const { action, pull_request: pr, repository: repo, installation } = req.body;
  if (!['opened', 'synchronize'].includes(action)) {
    return res.status(200).send('Ignored');
  }

  try {
    const token = await getInstallationTokenHelperFun(installation.id);
    const diff = await fetchPRDiff(
      repo.owner.login,
      repo.full_name,
      pr.number,
      token,
    );

    // Kick off your review pipeline
    await handlePullRequest({
      owner: repo.owner.login,
      repo: repo.name,
      prNumber: pr.number,
      diff,
      installationToken: token,
    });

    res.status(200).send('Review posted');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error processing PR');
  }
}
