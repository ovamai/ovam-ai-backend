import { Request, Response } from 'express';
import { handlePullRequest, reviewPR } from '../services/reviewService';
import {
  fetchPRDiff,
  getInstallationTokenHelperFun,
} from '../services/githubService';
import { verifySignature } from '../utils/github_verify_signature';

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
    console.log('line 94 event ', event);
    console.log('line 94 payload ', payload);
    if (event === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request;
      const repo = payload.repository;
      const installation = payload.installation;

      if (!pr || !repo || !installation) {
        return res.status(400).send('Invalid payload structure');
      }

      console.log(`PR #${pr.number} action: ${action}`);

      if (action === 'opened' || action === 'synchronize') {
        const installationToken = await getInstallationTokenHelperFun(
          installation.id,
        );
        console.log(
          `Obtained installation token for installation ID: ${installation.id}`,
        );

        // Extract repo info
        const [owner, repoName] = repo.full_name.split('/');

        // Fetch PR diff
        const diff = await fetchPRDiff(
          owner,
          repoName,
          pr.number,
          installationToken,
        );

        console.log(`Fetched diff for PR #${pr.number} (${diff.length} bytes)`);

        // TODO: Pass diff to AI processing queue here

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
