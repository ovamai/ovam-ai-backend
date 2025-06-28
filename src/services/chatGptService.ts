import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const prompts = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../config/prompts.private.json'),
    'utf-8',
  ),
);

export async function getCodeReview(diff: string): Promise<string> {
  logger.info(`getCodeReview started and diff ${diff}`);
  if (!diff?.trim()) {
    throw new Error('Diff parameter is required');
  }
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: prompts.reviewSystemPrompt,
    },
    {
      role: 'user',
      content: `
  Please review the following Git diff (_in triple-backticks_) and give me feedback under the prescribed headings:
  
  \`\`\`diff
  (diff you pasted)
  \`\`\`
  `,
    },
  ];
  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', //"gpt-4o-mini",
    messages: messages,
  });
  logger.info(`resp ${JSON.stringify(resp)}`);
  const choice = resp.choices?.[0];
  const msg = choice?.message;
  if (!msg?.content) {
    throw new Error('No reply from ChatGPT');
  }
  logger.info('OpenAI response message', {
    message: msg,
  });

  return msg.content.trim();
}

export async function getCodeSuggestion(diff: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: prompts.suggestionSystemPrompt,
    },
  ];

  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', //"gpt-4o-mini",
    messages: messages,
  });
  logger.info(`resp ${JSON.stringify(resp)}`);
  const choice = resp.choices?.[0];
  const msg = choice?.message;
  if (!msg?.content) {
    throw new Error('No reply from ChatGPT');
  }
  logger.info('OpenAI response message', {
    message: msg,
  });

  return msg.content.trim();
}

export async function getCodeReplySuggestion(diff: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    // — your original system prompt —
    {
      role: 'system',
      content: prompts.suggestionMasterPrompt,
    },
  ];

  // …call your OpenAI chat completion with `messages`…
  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', //"gpt-4o-mini",
    messages: messages,
  });
  logger.info(`resp ${JSON.stringify(resp)}`);
  const choice = resp.choices?.[0];
  const msg = choice?.message;
  if (!msg?.content) {
    throw new Error('No reply from ChatGPT');
  }
  logger.info('OpenAI response message', {
    message: msg,
  });

  return msg.content.trim();
}
