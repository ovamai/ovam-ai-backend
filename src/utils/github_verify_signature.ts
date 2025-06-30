import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { APP_ID, PRIVATE_KEY, WEBHOOK_SECRET } from '../config';

export const verifySignature = (req: express.Request): boolean => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || Array.isArray(signature)) return false;

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update((req as any).rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
};

export const generateJWT = (): string => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // issued at time, 60 seconds in the past to allow clock drift
    exp: now + 600, // expires after 10 minutes
    iss: APP_ID, // GitHub App ID
  };
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
};
