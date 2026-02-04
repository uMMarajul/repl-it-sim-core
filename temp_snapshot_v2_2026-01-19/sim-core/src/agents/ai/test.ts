/**
 * Simple manual test for AI Agent Profile Extraction
 * 
 * Usage: Set OPENAI_API_KEY environment variable, then run:
 * ts-node src/agents/ai/test.ts
 */

import { createAIAgent } from './aiAgentService'

async function testProfileExtraction() {
    console.log('🧪 Testing AI Agent Profile Extraction...\n')

    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
        console.error('❌ Error: OPENAI_API_KEY environment variable not set')
        console.log('Set it with: $env:OPENAI_API_KEY="your-api-key" (PowerShell)')
        process.exit(1)
    }

    // Create AI agent
    const agent = createAIAgent(apiKey, 'gpt-4o-mini')

    // Test conversation
    const userMessage = `I'm 28 years old, earning £45,000 a year as a software developer. I rent a flat for £1,200 per month and spend about £2,500 total each month including rent. I have £8,000 in savings but no pension yet. I'm single with no kids.`

    console.log(`👤 User: ${userMessage}\n`)

    try {
        const response = await agent.processUserInput(userMessage)

        console.log(`🤖 Agent: ${response.message}\n`)
        console.log('📊 Extracted Profile:')
        console.log(JSON.stringify(response.profileExtracted, null, 2))
        console.log(`\n✅ Profile Complete: ${response.profileComplete}`)
        console.log(`📈 Confidence: ${(response.confidence * 100).toFixed(0)}%`)

        if (response.missingProfileFields && response.missingProfileFields.length > 0) {
            console.log(`\n❓ Missing Fields: ${response.missingProfileFields.join(', ')}`)
        }

        console.log('\n✅ Test completed successfully!')

    } catch (error: any) {
        console.error('❌ Test failed:', error.message)
        console.error(error)
        process.exit(1)
    }
}

testProfileExtraction()
