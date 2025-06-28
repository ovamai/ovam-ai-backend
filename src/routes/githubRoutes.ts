import { Router } from 'express';
import {
  getInstallationToken,
  webhookCall,
} from '../controllers/githubController';
import { verifySignature } from '../utils/github_verify_signature';
import {
  fetchPRDiff,
  getInstallationTokenHelperFun,
} from '../services/githubService';

const router = Router();
router.get('/installation-token', getInstallationToken);

router.post('/github-webhook', webhookCall);
export default router;
