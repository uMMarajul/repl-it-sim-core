/**
 * LLM Client - OpenAI Integration
 * 
 * Abstraction layer for OpenAI API calls with structured output support.
 * Provides retry logic, error handling, and token tracking.
 * 
 * @module agents/ai/llmClient
 */

import OpenAI from 'openai'
import {
    LLMConfig,
    LLMResponse,
    Message,
    LLMAPIError,
    StructuredPrompt
} from './types'

/**
 * LLM Client for OpenAI integration
 */
export class LLMClient {
    private client: OpenAI
    private config: LLMConfig

    constructor(config: LLMConfig) {
        this.config = {
            temperature: 0.7,
            maxTokens: 2000,
            jsonMode: false,
            ...config
        }

        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            dangerouslyAllowBrowser: true // Client-side usage (as requested)
        })
    }

    /**
     * Send a chat completion request
     * 
     * @param messages - Conversation messages
     * @param options - Override default config options
     * @returns LLM response
     */
    async chat<T = string>(
        messages: Message[],
        options?: {
            temperature?: number
            maxTokens?: number
            jsonMode?: boolean
            responseFormat?: any
        }
    ): Promise<LLMResponse<T>> {
        const config = { ...this.config, ...options }

        try {
            const completion = await this.client.chat.completions.create({
                model: config.model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                response_format: config.jsonMode || config.responseFormat
                    ? { type: 'json_object' }
                    : { type: 'text' }
            })

            const choice = completion.choices[0]
            const rawText = choice.message.content || ''

            // Parse JSON if in JSON mode
            let content: T
            if (config.jsonMode || config.responseFormat) {
                try {
                    content = JSON.parse(rawText) as T
                } catch (e) {
                    throw new LLMAPIError(
                        `Failed to parse JSON response: ${e}`,
                        undefined,
                        { rawText }
                    )
                }
            } else {
                content = rawText as T
            }

            return {
                content,
                rawText,
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0,
                model: completion.model,
                finishReason: choice.finish_reason
            }
        } catch (error: any) {
            if (error instanceof LLMAPIError) {
                throw error
            }

            // Wrap OpenAI errors
            throw new LLMAPIError(
                error.message || 'OpenAI API error',
                error.status,
                error
            )
        }
    }

    /**
     * Send a structured prompt with schema-guided output
     * 
     * @param prompt - Structured prompt with schema
     * @returns Parsed response
     */
    async structuredPrompt<T>(prompt: StructuredPrompt<T>): Promise<LLMResponse<T>> {
        const messages: Message[] = [
            {
                role: 'system',
                content: prompt.systemPrompt,
                timestamp: new Date()
            }
        ]

        // Add few-shot examples if provided
        if (prompt.examples) {
            for (const example of prompt.examples) {
                messages.push(
                    {
                        role: 'user',
                        content: example.user,
                        timestamp: new Date()
                    },
                    {
                        role: 'assistant',
                        content: example.assistant,
                        timestamp: new Date()
                    }
                )
            }
        }

        // Add user prompt
        messages.push({
            role: 'user',
            content: prompt.userPrompt,
            timestamp: new Date()
        })

        // Call LLM with JSON mode if schema provided
        const response = await this.chat<any>(messages, {
            jsonMode: !!prompt.responseSchema,
            temperature: 0.5 // Lower temperature for structured output
        })

        // Apply custom parser if provided
        if (prompt.parser && response.content) {
            try {
                const parsed = prompt.parser(
                    typeof response.content === 'string'
                        ? response.content
                        : JSON.stringify(response.content)
                )
                return {
                    ...response,
                    content: parsed
                }
            } catch (e) {
                throw new LLMAPIError(
                    `Parser failed: ${e}`,
                    undefined,
                    { rawContent: response.content }
                )
            }
        }

        return response
    }

    /**
     * Chat with retry logic
     * 
     * @param messages - Conversation messages  
     * @param options - Options
     * @param maxRetries - Maximum retry attempts
     * @returns LLM response
     */
    async chatWithRetry<T = string>(
        messages: Message[],
        options?: {
            temperature?: number
            maxTokens?: number
            jsonMode?: boolean
        },
        maxRetries: number = 3
    ): Promise<LLMResponse<T>> {
        let lastError: Error | undefined

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.chat<T>(messages, options)
            } catch (error: any) {
                lastError = error

                // Don't retry on certain errors
                if (error instanceof LLMAPIError && error.statusCode === 401) {
                    throw error // Invalid API key - no point retrying
                }

                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries - 1) {
                    await this.sleep(Math.pow(2, attempt) * 1000)
                }
            }
        }

        throw lastError || new LLMAPIError('Max retries exceeded')
    }

    /**
     * Helper to sleep for delay
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Get embedding for text (for semantic search)
     * 
     * @param text - Text to embed
     * @returns Embedding vector
     */
    async embed(text: string): Promise<number[]> {
        try {
            const response = await this.client.embeddings.create({
                model: 'text-embedding-3-small',
                input: text
            })

            return response.data[0].embedding
        } catch (error: any) {
            throw new LLMAPIError(
                error.message || 'Embedding API error',
                error.status,
                error
            )
        }
    }

    /**
     * Calculate tokens for text (approximate)
     * Uses rough estimate: 1 token ≈ 4 characters for English
     */
    estimateTokens(text: string): number {
        return Math.ceil(text.length / 4)
    }
}

/**
 * Create LLM client from environment variable
 * 
 * @param apiKey - OpenAI API key (defaults to OPENAI_API_KEY env var)
 * @param model - Model to use (defaults to gpt-4o-mini)
 * @returns LLM client instance
 */
export function createLLMClient(
    apiKey?: string,
    model: string = 'gpt-4o-mini'
): LLMClient {
    const key = apiKey || process.env.OPENAI_API_KEY

    if (!key) {
        throw new LLMAPIError(
            'OpenAI API key not provided. Pass it as parameter or set OPENAI_API_KEY environment variable.',
            undefined,
            { hint: 'Get API key from https://platform.openai.com/api-keys' }
        )
    }

    return new LLMClient({
        apiKey: key,
        model,
        temperature: 0.7,
        maxTokens: 2000
    })
}
