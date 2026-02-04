/**
 * AI Agent Module - Public API
 * 
 * Main entry point for AI agent functionality.
 * 
 * @module agents/ai
 */

export { LLMClient, createLLMClient } from './llmClient'
export { AIAgentService, createAIAgent } from './aiAgentService'
export * from './types'
export * from './prompts/profileExtraction'
