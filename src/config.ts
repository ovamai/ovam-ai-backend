import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const PORT = process.env.PORT || 8080;
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;
export const APP_ID = process.env.APP_ID!;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH!;

export const PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
export const OPENAI_MODEL = process.env.OPENAI_MODEL || '';
