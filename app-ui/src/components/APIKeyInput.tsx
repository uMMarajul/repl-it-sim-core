/**
 * API Key Configuration Component
 * 
 * Simple component to let users enter their OpenAI API key
 */

import { useState } from 'react'

interface APIKeyInputProps {
    onKeySubmit: (apiKey: string) => void
}

export function APIKeyInput({ onKeySubmit }: APIKeyInputProps) {
    const [apiKey, setApiKey] = useState('')
    const [showKey, setShowKey] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (apiKey.trim()) {
            onKeySubmit(apiKey.trim())
        }
    }

    return (
        <div style={{
            maxWidth: '600px',
            margin: '40px auto',
            padding: '32px',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            backgroundColor: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
            <h2 style={{ marginTop: 0, fontSize: '24px', marginBottom: '8px' }}>
                🔑 Enter OpenAI API Key
            </h2>
            <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '24px' }}>
                Your API key is used client-side and never leaves your browser.
                Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>OpenAI Platform</a>.
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: 600
                    }}>
                        API Key
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                paddingRight: '100px',
                                border: '1px solid #ced4da',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontFamily: 'monospace'
                            }}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                padding: '6px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#6c757d'
                            }}
                        >
                            {showKey ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!apiKey.trim()}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: apiKey.trim() ? '#007bff' : '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: apiKey.trim() ? 'pointer' : 'not-allowed'
                    }}
                >
                    Start Chat
                </button>
            </form>

            <div style={{
                marginTop: '24px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#495057'
            }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>💡 Note:</div>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>Your API key is stored in browser memory only</li>
                    <li>It will be lost if you refresh the page</li>
                    <li>Using GPT-4o-mini (~$0.15/million tokens)</li>
                </ul>
            </div>
        </div>
    )
}
