/**
 * AI Chat Assistant Component - Enhanced with Intelligence
 * 
 * Features:
 * 1. Parameter extraction from natural language
 * 2. Closest scenario mapping for unsupported requests
 * 3. Multi-turn conversations with follow-up questions
 */

import { useState, useRef, useEffect } from 'react'
import { ScenarioId, getScenarioById } from '../../../sim-core/src/config/index'
import { type ConversationState } from '../types/chatState'
import { ConfigDialog } from './ConfigDialog'
import { getScenarioDefinition } from '../data/scenarioDefinitions'
import { getTemplate } from '../config/simplifiedTemplates'
import { ChatChart } from './ChatChart'
import { useSimulation } from '../hooks/useSimulation'
import { useScenarioStore } from '../state/scenarioStore'
import '../styles/ChatAssistant.css'
import '../styles/ChatDialog.css'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    scenarioAction?: {
        scenarioId: ScenarioId
        name: string
        params?: any
    }
    chartSnapshot?: {
        type: 'netWorth' | 'cashFlow'
        data: any[]
    }
}

export function ChatAssistant() {
    const { state } = useScenarioStore()
    const { chartData, solvency, simulationTimestamp } = useSimulation() // Connect to simulation engine

    const [messages, setMessages] = useState<Message[]>([{
        id: '1',
        role: 'assistant',
        content: `Hi ${state.selectedProfile.name.split(' ')[0]}! I'm your financial planning assistant.

I can help you model your financial future. You can:
1. **Set Goals** like buying a house or retiring early.
2. **Stress Test** your plan against market crashes or job loss.
3. **Explore Scenarios** to see their immediate impact on your wealth.

Select a path below to get started, or just tell me what you want to do!`,
        timestamp: new Date()
    }])
    const [input, setInput] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [conversation, setConversation] = useState<ConversationState>({
        stage: 'idle',
        collectedParams: {},
        requiredFields: [],
        askedFields: []
    })
    const [isTyping, setIsTyping] = useState(false)
    const [sessionId] = useState(() => `session_${Date.now()}`)
    const [showConfigDialog, setShowConfigDialog] = useState<{ scenarioId: ScenarioId, params?: any } | null>(null)

    // Ref for auto-scroll
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Keyboard shortcuts: Escape to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showConfigDialog) {
                    setShowConfigDialog(null) // Close config first
                } else if (isOpen) {
                    setIsOpen(false) // Then close chat
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, showConfigDialog])



    // Helper to trigger config dialog
    const triggerScenarioConfig = (scenarioId: ScenarioId, params?: any) => {
        // Emit custom event with extracted parameters
        console.log('[ChatAssistant] 📡 Dispatching openScenarioConfig event:', { scenarioId, params })
        window.dispatchEvent(new CustomEvent('openScenarioConfig', {
            detail: { scenarioId, params }
        }))
        console.log('[ChatAssistant] ✅ Event dispatched to window')
    }

    // State to track if we're waiting for a solvency update after a change
    const [waitingForSolvencyCheck, setWaitingForSolvencyCheck] = useState(false)
    // State to track the timestamp of the simulation BEFORE the save
    const [preSaveTimestamp, setPreSaveTimestamp] = useState<number>(0)

    // NEW: Track the scenario name we just saved, so we can send the success message once data is ready
    const [pendingSuccessScenario, setPendingSuccessScenario] = useState<string | null>(null)

    // Feasibility Guard: Watch for solvency changes after a config save
    useEffect(() => {
        if (!waitingForSolvencyCheck) return

        // Safety check for undefined solvency
        if (!solvency || !chartData) {
            console.log('[ChatAssistant] ⏳ Solvency/Chart data not ready yet...')
            return
        }

        // NEW: Check if we have a FRESH simulation result
        // Use the top-level timestamp we just extracted
        const currentTimestamp = simulationTimestamp || 0

        console.log('[ChatAssistant] 🕵️ Feasibility Check:', {
            waiting: waitingForSolvencyCheck,
            preSaveTime: preSaveTimestamp,
            currentTime: currentTimestamp,
            isFresh: currentTimestamp > preSaveTimestamp
        })

        // If the current data is still from BEFORE the save, keep waiting
        if (currentTimestamp <= preSaveTimestamp) {
            console.log('[ChatAssistant] ⏳ Simulation incorrectly used stale data. Waiting for update...')
            return
        }

        console.log('[ChatAssistant] ✅ Fresh data detected! Processing updates...')

        // 1. Send Success Message (Delayed until now)
        if (pendingSuccessScenario) {
            // Capture SNAPSHOT of NEW chart data (now appearing in the chat)
            const snapshotData = chartData.netWealth ? chartData.netWealth.slice(0, 30) : []

            const successMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ Great! I've added your "${pendingSuccessScenario}" scenario. Here is the impact on your Net Worth:`,
                timestamp: new Date(),
                chartSnapshot: {
                    type: 'netWorth',
                    data: snapshotData
                }
            }
            setMessages(prev => [...prev, successMessage])
            setPendingSuccessScenario(null) // Clear pending
        }

        // 2. Run Feasibility/Solvency Check
        const extendedSolvency = solvency as any

        if (!solvency.isSolvent) {
            // Case 1: Total Insolvency (Net Worth < 0)
            console.log('[ChatAssistant] ⚠️ Infeasibility Detected! Triggering alert.')
            const warningMessage: Message = {
                id: (Date.now() + 1).toString(), // +1 to ensure order after success message
                role: 'assistant',
                content: `⚠️ **Feasibility Alert**: This goal is **impossible** given your current assets. It creates a total projected deficit of **£${solvency.maxDeficit.toLocaleString()}**.`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, warningMessage])

        } else if (extendedSolvency.maxCashShortfall > 0) {
            // Case 2: Liquidity Shortfall (Cash < 0, but Solvency > 0)
            console.log('[ChatAssistant] ⚠️ Liquidity Shortfall Detected! Triggering advice.')

            let advice = ""
            if (extendedSolvency.canFixWithLiquidation) {
                advice = `You have enough in investments to cover this. You would need to sell **£${Math.ceil(extendedSolvency.requiredLiquidation).toLocaleString()}** from your ISA or GIA.`
            } else {
                advice = `You have a cash shortfall of **£${Math.ceil(Math.abs(extendedSolvency.maxCashShortfall)).toLocaleString()}**, and unfortunately your liquidatable assets (ISA/GIA) are not enough to cover it immediately.`
            }

            const warningMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ **Cash Shortfall**: You don't have enough liquid cash for this goal.\n\n${advice}`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, warningMessage])

        } else {
            console.log('[ChatAssistant] ✅ Plan deemed solvent during check.')
        }

        // Reset flag ONLY after we have checked fresh data
        setWaitingForSolvencyCheck(false)

    }, [solvency, waitingForSolvencyCheck, preSaveTimestamp, chartData, pendingSuccessScenario, simulationTimestamp])

    // Success feedback when config is saved
    const handleConfigSaved = (scenarioName: string) => {
        // DO NOT send message here. Defer until simulation updates.
        setShowConfigDialog(null) // Close the dialog
        setPendingSuccessScenario(scenarioName) // Queue the message

        // Capture the CURRENT simulation timestamp (which is now "old")
        const currentTimestamp = simulationTimestamp || 0
        setPreSaveTimestamp(currentTimestamp)
        console.log('[ChatAssistant] 🔒 Capturing Pre-Save Timestamp:', currentTimestamp)

        // Trigger availability check for the *next* simulation update
        setWaitingForSolvencyCheck(true)
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        const userInput = input
        setInput('')

        // Call AI Backend
        await handleAIResponse(userInput, sessionId, { ...state, mode: journeyMode, solvency }, setMessages, triggerScenarioConfig, setIsTyping, setShowConfigDialog)
    }

    const [journeyMode, setJourneyMode] = useState<'selection' | 'goals' | 'health' | 'events'>('selection')

    // Journey Definitions
    const JOURNEY_OPTIONS = [
        { id: 'goals', label: '🎯 Set Goals', description: 'Plan for big milestones like a house or wedding' },
        { id: 'health', label: '💪 Improve Health', description: 'Optimize savings, debt, and investments' },
        { id: 'events', label: '⚡ Test Events', description: 'Stress test against job loss or market crashes' }
    ]

    const JOURNEY_CHIPS: Record<string, { id: ScenarioId, label: string }[]> = {
        goals: [
            { id: ScenarioId.BUY_HOME, label: '🏠 Buy a House' },
            { id: ScenarioId.MARRIAGE, label: '💍 Wedding' },
            { id: ScenarioId.BUY_VEHICLE, label: '🚗 Buy a Car' },
            { id: ScenarioId.CUSTOM_GOAL, label: '✨ Custom Goal' }
        ],
        health: [
            { id: ScenarioId.EMERGENCY_FUND, label: '💰 Emergency Fund' },
            { id: ScenarioId.DEBT_CONSOLIDATION, label: '💳 Pay Off Debt' },
            { id: ScenarioId.PENSION_CONTRIBUTION, label: '📈 Maximize Pension' },
            { id: ScenarioId.START_INVESTING_ISA, label: '🇬🇧 Start ISA' }
        ],
        events: [
            { id: ScenarioId.JOB_LOSS, label: '💼 Job Loss' },
            { id: ScenarioId.MARKET_CRASH, label: '📉 Market Crash' },
            { id: ScenarioId.FAMILY_ILLNESS, label: '🏥 Family Illness' },
            { id: ScenarioId.INTEREST_RATE_INCREASE, label: '📈 Rate Hike' }
        ]
    }

    // Reset journey on new session or close
    useEffect(() => {
        if (!isOpen) setJourneyMode('selection')
    }, [isOpen])

    const handleQuickAction = (scenarioId: ScenarioId) => {
        const INTRO_PHRASES: Record<string, string> = {
            [ScenarioId.BUY_HOME]: "I'm planning to buy a house",
            [ScenarioId.MARRIAGE]: "I'm planning a wedding",
            [ScenarioId.BUY_VEHICLE]: "I'm looking to buy a car",
            [ScenarioId.CUSTOM_GOAL]: "I have a specific financial goal in mind",
            [ScenarioId.EMERGENCY_FUND]: "I want to build an emergency fund",
            [ScenarioId.DEBT_CONSOLIDATION]: "I want to pay off some debt",
            [ScenarioId.PENSION_CONTRIBUTION]: "I want to look at my pension contributions",
            [ScenarioId.START_INVESTING_ISA]: "I want to start investing in an ISA",
            [ScenarioId.JOB_LOSS]: "What would happen if I lost my job?",
            [ScenarioId.MARKET_CRASH]: "How would a market crash affect me?",
            [ScenarioId.FAMILY_ILLNESS]: "I want to stress test for a family illness",
            [ScenarioId.INTEREST_RATE_INCREASE]: "How would an interest rate increase affect my mortgage?"
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: INTRO_PHRASES[scenarioId] || `I'm interested in the ${scenarioId.replace(/_/g, ' ').toLowerCase()} scenario`,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])

        // Call Backend directly to establish context
        handleAIResponse(
            userMessage.content,
            sessionId,
            { ...state, mode: journeyMode },
            setMessages,
            triggerScenarioConfig,
            setIsTyping,
            setShowConfigDialog
        )
    }

    // Resize Logic
    const [dimensions, setDimensions] = useState({ width: 400, height: 600 })
    const isResizingRef = useRef(false)
    const resizeStartRef = useRef({ x: 0, y: 0, startWidth: 0, startHeight: 0 })

    const startResize = (e: React.MouseEvent) => {
        isResizingRef.current = true
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            startWidth: dimensions.width,
            startHeight: dimensions.height
        }
        document.addEventListener('mousemove', handleResize)
        document.addEventListener('mouseup', stopResize)
        e.preventDefault() // Prevent selection
    }

    const handleResize = (e: MouseEvent) => {
        if (!isResizingRef.current) return

        // Calculate delta (Top-Left corner resize means dragging Left/Up increases size)
        const deltaX = resizeStartRef.current.x - e.clientX
        const deltaY = resizeStartRef.current.y - e.clientY

        setDimensions({
            width: Math.max(300, Math.min(800, resizeStartRef.current.startWidth + deltaX)),
            height: Math.max(400, Math.min(900, resizeStartRef.current.startHeight + deltaY))
        })
    }

    const stopResize = () => {
        isResizingRef.current = false
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', stopResize)
    }

    // Chat Active State (Shrink chips if conversation started)
    const isChatActive = messages.length > 1

    // Quick Actions Collapse Logic
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Auto-collapse when user types or sends message
    useEffect(() => {
        if (isTyping) {
            setIsCollapsed(true)
        }
    }, [isTyping])

    const renderQuickActions = () => {
        const minimizedClass = isChatActive ? 'compact' : ''

        // Collapsed View (Button Only)
        if (isChatActive && isCollapsed) {
            return (
                <div className={`quick-actions collapsed`}>
                    <button
                        className="quick-actions-toggle"
                        onClick={() => setIsCollapsed(false)}
                    >
                        💡 Show Suggestions
                    </button>
                </div>
            )
        }

        if (journeyMode === 'selection') {
            return (
                <div className={`quick-actions ${minimizedClass}`}>
                    <div className="quick-actions-header-row">
                        <p className="quick-actions-label">What would you like to do?</p>
                        {isChatActive && (
                            <button
                                className="minimize-btn"
                                onClick={() => setIsCollapsed(true)}
                                title="Minimize suggestions"
                            >
                                ⬇
                            </button>
                        )}
                    </div>
                    <div className="quick-actions-grid journey-grid">
                        {JOURNEY_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                className="quick-action-btn journey-btn"
                                onClick={() => {
                                    setJourneyMode(option.id as any)
                                    // Don't collapse here, user needs to see sub-options
                                }}
                            >
                                <span className="journey-title">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )
        }

        return (
            <div className={`quick-actions ${minimizedClass}`}>
                <div className="quick-actions-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="back-btn" onClick={() => setJourneyMode('selection')}>← Back</button>
                        <p className="quick-actions-label">{JOURNEY_OPTIONS.find(j => j.id === journeyMode)?.label}</p>
                    </div>
                    {isChatActive && (
                        <button
                            className="minimize-btn"
                            onClick={() => setIsCollapsed(true)}
                            title="Minimize suggestions"
                        >
                            ⬇
                        </button>
                    )}
                </div>
                <div className="quick-actions-grid">
                    {JOURNEY_CHIPS[journeyMode]?.map((action) => (
                        <button
                            key={action.id}
                            className="quick-action-btn"
                            onClick={() => {
                                handleQuickAction(action.id)
                                setIsCollapsed(true) // Collapse after selection
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={`chat-assistant ${isOpen ? 'open' : 'closed'}`}>
            <button
                className="chat-toggle"
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? 'Close assistant' : 'Open assistant'}
            >
                {isOpen ? '✕' : '💬'} AI Assistant
            </button>

            {isOpen && (
                <div
                    className="chat-container"
                    style={{ width: dimensions.width, height: dimensions.height }}
                >
                    {/* Resize Handle (Top Left) */}
                    <div
                        className="resize-handle"
                        onMouseDown={startResize}
                        title="Drag to resize"
                    />

                    <div className="chat-header">
                        <h3>💬 Financial Planning Assistant</h3>
                        <p className="chat-subtitle">Let me help you configure your goals</p>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message-row ${msg.role}`}>
                                {msg.role === 'assistant' && (
                                    <div className="avatar assistant-avatar">
                                        <img src="/avatar-agent.png" alt="Agent" className="avatar-image" />
                                    </div>
                                )}

                                <div className={`message ${msg.role}`}>
                                    <div className="message-content">
                                        {msg.content}
                                        {/* Render Chart Snapshot if available */}
                                        {msg.chartSnapshot && (
                                            <ChatChart
                                                data={msg.chartSnapshot.data}
                                                type={msg.chartSnapshot.type}
                                            />
                                        )}
                                    </div>
                                    {msg.scenarioAction && (
                                        <div className="scenario-action">
                                            <div className="action-completed">
                                                ✓ Configuration opened
                                                {msg.scenarioAction.params && (
                                                    <div className="param-preview">
                                                        Pre-filled with your values
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                className="reopen-config-btn"
                                                onClick={() => setShowConfigDialog({
                                                    scenarioId: msg.scenarioAction!.scenarioId,
                                                    params: msg.scenarioAction!.params
                                                })}
                                            >
                                                🔄 Reopen Configuration
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="avatar-spacer" style={{ width: 0 }} />
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message-row assistant">
                                <div className="avatar assistant-avatar">
                                    <img src="/avatar-agent.png" alt="Agent" className="avatar-image" />
                                </div>
                                <div className="message typing">
                                    <span className="dot">●</span><span className="dot">●</span><span className="dot">●</span>
                                </div>
                            </div>
                        )}
                        {/* Scroll anchor for auto-scroll */}
                        <div ref={messagesEndRef} />
                    </div>

                    {renderQuickActions()}

                    <div className="chat-footer">
                        <div className="chat-input">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={conversation.stage === 'gathering_info' ? 'Your answer...' : 'Describe your financial goal...'}
                            />
                            <button onClick={handleSend} disabled={!input.trim()}>
                                Send
                            </button>
                        </div>
                        <div className="chat-disclaimer">
                            ⚠️ Simulated Assistant - Not Regulated Advice
                        </div>
                    </div>
                    {/* Inline Config Dialog - MOVED INSIDE CONTAINER */}
                    {showConfigDialog && (() => {
                        console.log('[ChatAssistant] 🎨 RENDERING dialog for:', showConfigDialog)

                        const scenarioId = showConfigDialog.scenarioId
                        const scenarioMetadata = getScenarioById(scenarioId)
                        const legacyType: 'goal' | 'action' | 'event' = (scenarioMetadata as any)?.legacyType || 'goal'

                        // Get definition
                        const simplifiedTemplate = getTemplate(scenarioId)
                        let definition = null
                        let isSimplified = false

                        if (simplifiedTemplate) {
                            const fullDefinition = getScenarioDefinition(scenarioId)
                            definition = {
                                displayName: fullDefinition?.displayName || scenarioId,
                                fields: simplifiedTemplate.fields,
                                description: fullDefinition?.description,
                                guidanceText: simplifiedTemplate.guidanceText || fullDefinition?.guidanceText
                            }
                            isSimplified = true
                        } else {
                            definition = getScenarioDefinition(scenarioId)
                        }

                        return definition ? (
                            <div className="chat-config-wrapper">
                                <ConfigDialog
                                    scenarioId={scenarioId}
                                    scenarioName={definition.displayName}
                                    fields={definition.fields}
                                    description={definition.description}
                                    guidanceText={definition.guidanceText}
                                    onClose={() => setShowConfigDialog(null)}
                                    onSave={handleConfigSaved}
                                    isSimplified={isSimplified}
                                    scenarioType={legacyType}
                                    initialValues={showConfigDialog.params}
                                />
                            </div>
                        ) : null
                    })()}
                </div>
            )}
        </div>
    )
}

// Backend API Integration
async function handleAIResponse(
    userInput: string,
    sessionId: string,
    context: any,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    triggerScenarioConfig: (scenarioId: ScenarioId, params?: any) => void,
    setIsTyping: (typing: boolean) => void,
    setShowConfigDialog: (config: { scenarioId: ScenarioId, params?: any } | null) => void
) {
    setIsTyping(true)

    try {
        // Extract simulation context from state
        const simulationContext = {
            profile: {
                name: context.selectedProfile?.name,
                age: context.selectedProfile?.age,
                income: context.selectedProfile?.income?.gross,
                savings: context.selectedProfile?.savings,
                expenses: context.selectedProfile?.expenses?.total
            },
            solvency: context.solvency, // NEW: Send solvency metrics (isSolvent, maxDeficit, etc.)
            activeScenarios: Array.isArray(context.scenarios)
                ? context.scenarios.filter((s: any) => s.active).map((s: any) => ({
                    id: s.id,
                    type: s.type,
                    params: s.params,
                    status: 'active'
                }))
                : []
        }

        console.log('[ChatAssistant] Sending context:', simulationContext)

        // Call backend API with context
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userInput,
                sessionId: sessionId, // Use persistent session ID
                context: simulationContext, // NEW: Send simulation state
                mode: context.mode || 'goals' // NEW: Send journey mode
            })
        })

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`)
        }

        const data = await response.json()
        console.log('[ChatAssistant] Backend Response:', data)
        console.log('[ChatAssistant] Context-aware:', !!data.context)

        setIsTyping(false)

        // Create assistant message with backend response
        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date()
        }

        // NEW: Check if AI returned an action to execute
        if (data.action) {
            console.log('[ChatAssistant] ✅ Action received:', data.action)
            console.log('[ChatAssistant] Action details:', {
                type: data.action.type,
                scenarioId: data.action.scenarioId,
                params: data.action.params
            })

            // Execute the action based on type
            switch (data.action.type) {
                case 'OPEN_CONFIG':
                    // Open config window INLINE in chat
                    const scenarioId = data.action.scenarioId as ScenarioId
                    newMessage.scenarioAction = {
                        scenarioId,
                        name: scenarioId.replace(/_/g, ' '),
                        params: data.action.params
                    }

                    // Show config dialog inline after a brief delay
                    console.log('[ChatAssistant] ⏰ Scheduling inline config dialog...')
                    setTimeout(() => {
                        console.log('[ChatAssistant] 🚀 Opening inline config:', scenarioId, data.action.params)
                        setShowConfigDialog({ scenarioId, params: data.action.params })
                    }, 800)
                    break

                case 'CREATE_SCENARIO':
                    // Future: Directly create scenario without opening config
                    console.log('[ChatAssistant] CREATE_SCENARIO not yet implemented')
                    break

                case 'MODIFY_SCENARIO':
                    // Future: Modify existing scenario
                    console.log('[ChatAssistant] MODIFY_SCENARIO not yet implemented')
                    break

                case 'ACTIVATE_SCENARIO':
                case 'DEACTIVATE_SCENARIO':
                    // Future: Toggle scenario on/off
                    console.log('[ChatAssistant] TOGGLE_SCENARIO not yet implemented')
                    break
            }
        } else {
            console.log('[ChatAssistant] ℹ️ No action in response')
        }

        setMessages(prev => [...prev, newMessage])

    } catch (error: any) {
        setIsTyping(false)

        // Better error messages with helpful diagnostics
        let content = '🔴 Sorry, I encountered an error'

        if (error.message?.includes('fetch') || error.name === 'TypeError') {
            content = '🔴 Cannot connect to AI backend.\n\nPlease check:\n• Backend server is running on http://localhost:8000\n• Run: python -m uvicorn api.agent_service:app --reload'
        } else if (error.message?.includes('Backend error')) {
            content = `🔴 Backend server error (${error.message}).\n\nPlease check the server logs.`
        } else {
            content = `🔴 Unexpected error: ${error.message}`
        }

        const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, errorMessage])
    }
}

