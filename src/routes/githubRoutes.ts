import { Router } from 'express';
import {
  getInstallationToken,
  webhookCall,
} from '../controllers/githubController';
import { fetchPRDiff } from '../services/githubService';

const router = Router();
router.post('/installation-token', getInstallationToken);

router.post('/github-webhook', webhookCall);

router.post('/fetchPRDiff', async (req, res) => {
  const { owner, repo, pull_number, token } = req.body;
  if (!owner || !repo || !pull_number || !token) {
    return res
      .status(401)
      .json({ status: false, message: 'Required param missing' });
  }
  const diff = await fetchPRDiff(owner, repo, pull_number, token);
  return res.status(200).json({ data: diff });
});
export default router;
