/**
 * AI Agent Demo Page
 * 
 * Standalone page for testing the AI agent profile extraction
 */

import { useState } from 'react'
import { AgentChat } from '../components/AgentChat'
import { APIKeyInput } from '../components/APIKeyInput'
import type { UserProfile } from '../../../sim-core/src/agents/types'

export function AIAgentPage() {
    const [apiKey, setApiKey] = useState<string | null>(null)
    const [completedProfile, setCompletedProfile] = useState<Partial<UserProfile> | null>(null)

    const handleProfileComplete = (profile: Partial<UserProfile>) => {
        setCompletedProfile(profile)
        console.log('Profile extraction complete:', profile)
    }

    if (!apiKey) {
        return (
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <APIKeyInput onKeySubmit={setApiKey} />
            </div>
        )
    }

    return (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '32px' }}>AI Financial Assistant</h1>
                        <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
                            Chat with the AI to extract your financial profile
                        </p>
                    </div>
                    <button
                        onClick={() => setApiKey(null)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        Change API Key
                    </button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: completedProfile ? '1fr 400px' : '1fr',
                    gap: '24px'
                }}>
                    {/* Chat Interface */}
                    <div>
                        <AgentChat
                            apiKey={apiKey}
                            onProfileComplete={handleProfileComplete}
                        />
                    </div>

                    {/* Profile Summary (when complete) */}
                    {completedProfile && (
                        <div style={{
                            padding: '24px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            height: 'fit-content'
                        }}>
                            <h3 style={{ marginTop: 0, fontSize: '20px', marginBottom: '16px' }}>
                                📋 Complete Profile
                            </h3>

                            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                                {completedProfile.age && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>AGE</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>{completedProfile.age} years old</div>
                                    </div>
                                )}

                                {completedProfile.retirementAge && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>RETIREMENT AGE</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>{completedProfile.retirementAge}</div>
                                    </div>
                                )}

                                {completedProfile.currentSalary && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>ANNUAL SALARY</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>£{completedProfile.currentSalary.toLocaleString()}</div>
                                    </div>
                                )}

                                {completedProfile.monthlyExpenses && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>MONTHLY EXPENSES</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>£{completedProfile.monthlyExpenses.toLocaleString()}</div>
                                    </div>
                                )}

                                {completedProfile.pensionBalance !== undefined && completedProfile.pensionBalance !== null && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>PENSION BALANCE</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>£{completedProfile.pensionBalance.toLocaleString()}</div>
                                    </div>
                                )}

                                {completedProfile.savingsBalance !== undefined && completedProfile.savingsBalance !== null && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>SAVINGS</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>£{completedProfile.savingsBalance.toLocaleString()}</div>
                                    </div>
                                )}

                                {completedProfile.isaBalance !== undefined && completedProfile.isaBalance !== null && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>ISA BALANCE</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>£{completedProfile.isaBalance.toLocaleString()}</div>
                                    </div>
                                )}

                                {completedProfile.riskTolerance && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>RISK TOLERANCE</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px', textTransform: 'capitalize' }}>
                                            {completedProfile.riskTolerance}
                                        </div>
                                    </div>
                                )}

                                {completedProfile.isMarried !== undefined && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>MARITAL STATUS</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                            {completedProfile.isMarried ? 'Married' : 'Single'}
                                        </div>
                                    </div>
                                )}

                                {completedProfile.hasChildren !== undefined && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '4px' }}>CHILDREN</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                            {completedProfile.hasChildren === 0 ? 'None' : completedProfile.hasChildren}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{
                                marginTop: '24px',
                                padding: '12px',
                                backgroundColor: '#d4edda',
                                borderRadius: '6px',
                                fontSize: '13px',
                                color: '#155724'
                            }}>
                                ✓ Profile is ready for scenario recommendations
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
