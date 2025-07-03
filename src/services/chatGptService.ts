import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { OPENAI_API_KEY, OPENAI_MODEL } from '../config';

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
  ${diff}
  \`\`\`
  `,
    },
  ];
  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
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
    model: OPENAI_MODEL,
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
    model: OPENAI_MODEL,
    messages: messages,
  });
  // logger.info(`resp ${JSON.stringify(resp)}`);
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

export async function reviewWithAI(prompt: string): Promise<string> {
  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You are Ovamai, a code review assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });
  const choice = resp.choices?.[0];
  const msg = choice?.message;
  if (!msg?.content) {
    throw new Error('No reply from ChatGPT');
  }
  return msg.content.trim();
}

export async function getPrSummary(diff: String) {
  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: prompts.CR_PRSummaryPrompt_chatGPT,
        },
        {
          role: 'user',
          content: `Here is the PR diff:\n\n${diff}`, // The actual diff
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg?.content) {
      throw new Error('No reply from ChatGPT');
    }
    return msg.content.trim();
  } catch (error) {
    console.error('Error generating PR summary:', error);
    throw new Error('Failed to generate PR summary');
  }
}

export async function getPrWalkthrough(diff: String) {
  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: prompts.CR_PRWalkthroughPrompt_Claude,
        },
        {
          role: 'user',
          content: `Here is the PR diff:\n\n${diff}`, // The actual diff
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg?.content) {
      throw new Error('No reply from ChatGPT');
    }
    return msg.content.trim();
  } catch (error) {
    console.error('Error generating walk through:', error);
    throw new Error('Failed to generate walk through');
  }
}

export async function getPrCodeReviewComments(diff: String) {
  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: prompts.CR_CodeReviewCommentsPrompt_ClaudeAi,
        },
        {
          role: 'user',
          content: `Here is the PR diff:\n\n${diff}`, // The actual diff
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg?.content) {
      throw new Error('No reply from ChatGPT');
    }
    return msg.content.trim();
  } catch (error) {
    console.error('Error generating Review comments:', error);
    throw new Error('Failed to generate Review comments');
  }
}

export async function getOverAllPrReviewComments(comments: any) {
  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: prompts.CR_ConsolidationPrompt_ClaudeAi,
        },
        {
          role: 'user',
          content: `Here is the PR diff:\n\n${comments}`, // The actual diff
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg?.content) {
      throw new Error('No reply from ChatGPT');
    }
    return msg.content.trim();
  } catch (error) {
    console.error('Error generating Review comments:', error);
    throw new Error('Failed to generate Review comments');
  }
}

export async function getOverAllPrSummary(comments: any) {
  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: prompts.CR_PRSummaryConsolidationPrompt_chatGPT,
        },
        {
          role: 'user',
          content: `Here is the PR diff:\n\n${comments}`, // The actual diff
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg?.content) {
      throw new Error('No reply from ChatGPT');
    }
    return msg.content.trim();
  } catch (error) {
    console.error('Error generating Review comments:', error);
    throw new Error('Failed to generate Review comments');
  }
}

export async function getOverAllPrWalkthrough(comments: any) {
  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: prompts.CR_PRWalkthroughConsolidationPrompt_Claude,
        },
        {
          role: 'user',
          content: `Here is the PR diff:\n\n${comments}`, // The actual diff
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg?.content) {
      throw new Error('No reply from ChatGPT');
    }
    return msg.content.trim();
  } catch (error) {
    console.error('Error generating Review comments:', error);
    throw new Error('Failed to generate Review comments');
  }
}