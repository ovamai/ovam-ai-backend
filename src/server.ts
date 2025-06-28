import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;
// const APP_ID = process.env.APP_ID!;
// const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH!;

// const PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

app.use(
  express.json({
    verify: (req, res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

// function verifySignature(req: express.Request): boolean {
//   const signature = req.headers['x-hub-signature-256'];
//   if (!signature || Array.isArray(signature)) return false;

//   const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
//   const digest = 'sha256=' + hmac.update((req as any).rawBody).digest('hex');
//   return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
// }

// function generateJWT(): string {
//   const now = Math.floor(Date.now() / 1000);
//   const payload = {
//     iat: now - 60,        // issued at time, 60 seconds in the past to allow clock drift
//     exp: now + 1200, // expires after 10 minutes
//     iss: APP_ID           // GitHub App ID
//   };
//   return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
// }

// async function getInstallationToken(installationId: number): Promise<string> {
//   const jwtToken = generateJWT();

//   const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${jwtToken}`,
//       Accept: 'application/vnd.github+json'
//     }
//   });

//   if (!response.ok) {
//     const errBody = await response.text();
//     throw new Error(`Failed to get installation token: ${response.status} - ${response.statusText} - ${errBody}`);
//   }

//   const data = await response.json();
//   return data.token;
// }

// Example: Fetch PR diff using GitHub API
// async function fetchPRDiff(owner: string, repo: string, pull_number: number, token: string): Promise<string> {
//   const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`;
//   const response = await fetch(url, {
//     headers: {
//       Authorization: `token ${token}`,
//       Accept: 'application/vnd.github.v3.diff'
//     }
//   });

//   if (!response.ok) {
//     throw new Error(`Failed to fetch PR diff: ${response.status} - ${response.statusText}`);
//   }

//   return response.text();
// }

// app.post('/api/v1/github-webhook', async (req, res) => {
//   try {
//     if (!verifySignature(req)) {
//       console.warn('⚠️ Invalid webhook signature');
//       return res.status(401).send('Invalid signature');
//     }

//     const event = req.headers['x-github-event'];
//     if (!event) {
//       return res.status(400).send('Missing event header');
//     }

//     const payload = req.body;
// console.log("line 94 event ", event)
// console.log("line 94 payload ", payload)
//     if (event === 'pull_request') {
//       const action = payload.action;
//       const pr = payload.pull_request;
//       const repo = payload.repository;
//       const installation = payload.installation;

//       if (!pr || !repo || !installation) {
//         return res.status(400).send('Invalid payload structure');
//       }

//       console.log(`PR #${pr.number} action: ${action}`);

//       if (action === 'opened' || action === 'synchronize') {
//         const installationToken = await getInstallationToken(installation.id);
//         console.log(`Obtained installation token for installation ID: ${installation.id}`);

//         // Extract repo info
//         const [owner, repoName] = repo.full_name.split('/');

//         // Fetch PR diff
//         const diff = await fetchPRDiff(owner, repoName, pr.number, installationToken);

//         console.log(`Fetched diff for PR #${pr.number} (${diff.length} bytes)`);
//         console.log(`Fetched diff for diff PR diff#${pr.number} (${diff} )`);

//         // TODO: Pass diff to AI processing queue here

//         // For demo, just respond with success
//         return res.status(200).send('PR processed successfully');
//       }
//     }

//     // For other events, just acknowledge
//     res.status(200).send('Event received');
//   } catch (error) {
//     console.error('Error processing webhook:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
