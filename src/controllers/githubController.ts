import { Request, Response } from 'express';
import { handlePullRequest, reviewPR } from '../services/reviewService';
import {
  addingComments,
  fetchPRDiff,
  generateSummaryFromDynamicJson,
  getInstallationTokenHelperFun,
  parseAndSplitDiff,
  postPRComment,
  ReviewComment,
  updatePullRequest,
} from '../services/githubService';
import { verifySignature } from '../utils/github_verify_signature';
import { getOverAllPrReviewComments, getOverAllPrSummary, getOverAllPrWalkthrough, getPrCodeReviewComments, getPrSummary, getPrWalkthrough } from '../services/chatGptService';

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

        // Extract repo info
        const [owner, repoName] = repo.full_name.split('/');
        const commit_id = pr?.head?.sha;
        const pull_number = pr?.number;

        // Fetch PR diff
        const diff = await fetchPRDiff(
          owner,
          repoName,
          pr.number,
          installationToken,
        );
        
        // TODO: Pass diff to AI processing queue here
        if(diff?.length > 30000) { // bytes
          let chunkedData = parseAndSplitDiff(diff, 25000);
          // console.log(`Parsed diff into ${chunkedData.length} chunks`);
          // console.log(`First chunk: ${JSON.stringify(chunkedData)}`);
          let pRSummary = [];
          let prWalkThrough = [];
          let prCodeReviews = [];
          for (const chunk of chunkedData) {
            let prChunkSummary = await getPrSummary(JSON.stringify(chunk));
            pRSummary.push(prChunkSummary);

            let chunkedWalkthrough = await getPrWalkthrough(JSON.stringify(chunk));
            prWalkThrough.push(chunkedWalkthrough);

            let prCodeReviewComments = await getPrCodeReviewComments(JSON.stringify(chunk));
            prCodeReviews.push(prCodeReviewComments);
          }
          
          // chunked PR summary
          let resultSummary = await getOverAllPrSummary(pRSummary);
          resultSummary = generateSummaryFromDynamicJson(JSON.parse(resultSummary));
          await updatePullRequest(owner, repoName, pull_number, pr?.title, resultSummary, pr?.base?.ref, installationToken);
          
          let resultWalkthrough = await getOverAllPrWalkthrough(prWalkThrough);
          await postPRComment(owner, repoName, pull_number, JSON.parse(resultWalkthrough));
          
          // chunked PR Code Review Comments
          let resultComments = await getOverAllPrReviewComments(prCodeReviews);
          const parsedPrCodeReview: ReviewComment[] = JSON.parse(resultComments);
          await addingComments(owner, repoName, pull_number, commit_id, parsedPrCodeReview);

          return res.status(200).send('PR processed successfully');
        }
        
        // Get PR summary
        let prSummary = await getPrSummary(diff);
        prSummary = generateSummaryFromDynamicJson(JSON.parse(prSummary));
        await updatePullRequest(owner, repoName, pull_number, pr?.title, prSummary, pr?.base?.ref, installationToken);

        // get PR walkthrough
        let prWalkthrough = await getPrWalkthrough(diff);
        await postPRComment(owner, repoName, pull_number, JSON.parse(prWalkthrough));

        // Get code review comments
        let prCodeReviewComments = await getPrCodeReviewComments(diff);
        const parsedPrCodeReview: ReviewComment[] = JSON.parse(prCodeReviewComments);
        await addingComments(owner, repoName, pull_number, commit_id, parsedPrCodeReview);


        // For demo, just respond with success
        return res.status(200).send('PR processed successfully');
      }
    }

    // For other events, just acknowledge
    res.status(200).send('Event received');
  } catch (error) {
    console.error('Error processing webhook:', error);
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
