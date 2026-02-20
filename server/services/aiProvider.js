/**
 * OpenAI provider with retry logic, timeout, and token tracking.
 */
import OpenAI from 'openai';

let client = null;

function getClient() {
    if (!client) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in environment variables.');
        }
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
}

const MODELS = {
    quick: 'gpt-4o-mini',
    standard: 'gpt-4o-mini',
    deep: 'gpt-4o',
};

const TIMEOUTS = {
    quick: 30000,
    standard: 45000,
    deep: 60000,
};

/**
 * Call the OpenAI chat completions API with retry and timeout.
 * @param {Object} options
 * @param {string} options.systemPrompt
 * @param {string} options.userPrompt
 * @param {string} [options.mode='standard']
 * @param {number} [options.maxTokens=2048]
 * @param {number} [options.temperature=0.7]
 * @param {boolean} [options.jsonMode=false]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{content: string, tokens: {input: number, output: number, total: number}}>}
 */
export async function chatCompletion({
    systemPrompt,
    userPrompt,
    mode = 'standard',
    maxTokens = 2048,
    temperature = 0.7,
    jsonMode = false,
    signal,
}) {
    const ai = getClient();
    const model = MODELS[mode] || MODELS.standard;
    const timeout = TIMEOUTS[mode] || TIMEOUTS.standard;
    const maxRetries = 3;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);

            // Merge external signal if provided
            if (signal) {
                signal.addEventListener('abort', () => controller.abort());
            }

            const params = {
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: maxTokens,
                temperature,
            };

            if (jsonMode) {
                params.response_format = { type: 'json_object' };
            }

            const response = await ai.chat.completions.create(params, {
                signal: controller.signal,
            });

            clearTimeout(timer);

            const choice = response.choices?.[0];
            const usage = response.usage || {};

            return {
                content: choice?.message?.content || '',
                tokens: {
                    input: usage.prompt_tokens || 0,
                    output: usage.completion_tokens || 0,
                    total: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
                },
            };
        } catch (err) {
            lastError = err;

            // Don't retry on abort, auth errors, or bad requests
            if (
                err.name === 'AbortError' ||
                err.status === 401 ||
                err.status === 400 ||
                err.status === 403
            ) {
                throw err;
            }

            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
                console.warn(`[AI] Attempt ${attempt} failed, retrying in ${delay}ms:`, err.message);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }

    throw lastError;
}
