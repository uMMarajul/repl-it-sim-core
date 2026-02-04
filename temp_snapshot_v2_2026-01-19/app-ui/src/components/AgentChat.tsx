/**
 * AI Agent Chat Component
 * 
 * Interactive chat interface for conversational profile extraction
 * and financial recommendations.
 */

import { useState, useEffect, useRef } from 'react'
import { createAIAgent } from '../../../sim-core/src/agents/ai'
import type { AgentResponse, Message } from '../../../sim-core/src/agents/ai/types'
import type { UserProfile } from '../../../sim-core/src/agents/types'

interface AgentChatProps {
    onProfileComplete?: (profile: Partial<UserProfile>) => void
    apiKey: string
}

export function AgentChat({ onProfileComplete, apiKey }: AgentChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [agent] = useState(() => createAIAgent(apiKey, 'gpt-4o-mini'))
    const [sessionId] = useState(() => {
        const stored = localStorage.getItem('chat_session_id')
        if (stored) return stored
        const newId = `session_${Date.now()}`
        localStorage.setItem('chat_session_id', newId)
        return newId
    })
    const [extractedProfile, setExtractedProfile] = useState<Partial<UserProfile>>({})
    const [profileComplete, setProfileComplete] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Initialize with greeting
    useEffect(() => {
        const greeting: Message = {
            role: 'assistant',
            content: agent.getInitialMessage(),
            timestamp: new Date()
        }
        setMessages([greeting])
    }, [agent])

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return

        const userMessage: Message = {
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsLoading(true)

        try {
            const response: AgentResponse = await agent.processUserInput(inputValue, sessionId)

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.message,
                timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMessage])

            // Update extracted profile
            if (response.profileExtracted) {
                setExtractedProfile(response.profileExtracted)
            }

            // Update profile complete status
            if (response.profileComplete !== undefined) {
                setProfileComplete(response.profileComplete)
                if (response.profileComplete && onProfileComplete && response.profileExtracted) {
                    onProfileComplete(response.profileExtracted)
                }
            }

        } catch (error: any) {
            console.error('Agent error:', error)

            const errorMessage: Message = {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#f8f9fa',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px'
            }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                    💬 AI Financial Assistant
                </h3>
                {profileComplete && (
                    <div style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 500
                    }}>
                        ✓ Profile Complete
                    </div>
                )}
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div style={{
                            maxWidth: '70%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            backgroundColor: msg.role === 'user' ? '#007bff' : '#e9ecef',
                            color: msg.role === 'user' ? '#fff' : '#212529',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5'
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start'
                    }}>
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            backgroundColor: '#e9ecef',
                            color: '#6c757d'
                        }}>
                            Typing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Profile Summary (if extracted) */}
            {Object.keys(extractedProfile).length > 0 && (
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid #e0e0e0',
                    backgroundColor: '#f8f9fa',
                    fontSize: '13px'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                        📊 Extracted Profile:
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '8px'
                    }}>
                        {extractedProfile.age && (
                            <div>Age: <strong>{extractedProfile.age}</strong></div>
                        )}
                        {extractedProfile.currentSalary && (
                            <div>Salary: <strong>£{extractedProfile.currentSalary.toLocaleString()}</strong></div>
                        )}
                        {extractedProfile.monthlyExpenses && (
                            <div>Expenses: <strong>£{extractedProfile.monthlyExpenses.toLocaleString()}/mo</strong></div>
                        )}
                        {extractedProfile.savingsBalance !== undefined && extractedProfile.savingsBalance !== null && (
                            <div>Savings: <strong>£{extractedProfile.savingsBalance.toLocaleString()}</strong></div>
                        )}
                    </div>
                </div>
            )}

            {/* Input */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                gap: '8px'
            }}>
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'none',
                        minHeight: '50px',
                        maxHeight: '100px'
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: isLoading || !inputValue.trim() ? '#6c757d' : '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    )
}
