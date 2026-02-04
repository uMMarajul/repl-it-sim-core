/**
 * Chat Widget Component
 * 
 * Collapsible chat widget that calls the backend API
 */

import { useState, useEffect, useRef } from 'react'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface ChatWidgetProps {
    apiUrl?: string
}

export function ChatWidget({ apiUrl = 'http://localhost:8000' }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoadingmessages, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Initial greeting
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: "Hello! I'm your AI financial assistant. I can help you plan your finances, set goals, and create realistic projections tailored to your situation in the UK.\n\nTo get started, could you tell me a bit about yourself? For example:\n- Your age and when you plan to retire\n- Your current income and monthly expenses\n- Any savings, investments, or debts you have\n-What financial goals you're working towards"
            }])
        }
    }, [isOpen, messages.length])

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch(`${apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    sessionId
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.message
            }])

            if (!sessionId) setSessionId(data.sessionId)
            if (data.profileExtracted) setProfile(data.profileExtracted)

        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}. Make sure the backend is running on ${apiUrl}`
            }])
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000
                }}
            >
                💬
            </button>
        )
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '400px',
            height: '600px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                backgroundColor: '#007bff',
                color: '#fff',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontWeight: 600, fontSize: '16px' }}>💬 AI Assistant</span>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: '20px',
                        cursor: 'pointer'
                    }}
                >
                    ×
                </button>
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
                            maxWidth: '80%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: msg.role === 'user' ? '#007bff' : '#e9ecef',
                            color: msg.role === 'user' ? '#fff' : '#212529',
                            whiteSpace: 'pre-wrap',
                            fontSize: '14px',
                            lineHeight: '1.4'
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: '#e9ecef',
                            color: '#6c757d',
                            fontSize: '14px'
                        }}>
                            Typing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Profile Summary */}
            {profile && Object.keys(profile).length > 1 && (
                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #e0e0e0',
                    backgroundColor: '#f8f9fa',
                    fontSize: '12px'
                }}>
                    <strong>Profile:</strong> {profile.age && `Age ${profile.age}`}
                    {profile.currentSalary && ` • £${profile.currentSalary.toLocaleString()}/yr`}
                </div>
            )}

            {/* Input */}
            <div style={{
                padding: '12px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                gap: '8px'
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px'
                    }}
                />
                <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: isLoading || !input.trim() ? '#6c757d' : '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    )
}
