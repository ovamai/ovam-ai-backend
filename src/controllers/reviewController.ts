import { Request, Response } from 'express';
import { reviewPR } from '../services/reviewService';

import { Octokit } from '@octokit/core';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env file

export async function postReview(req: Request, res: Response) {
  const { owner, repo, prNumber } = req.body;
  if (!owner || !repo || !prNumber) {
    return res
      .status(400)
      .json({ error: 'owner, repo, prNumber are required' });
  }
  try {
    const review = await reviewPR(owner, repo, Number(prNumber));
    res.json({ review });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
