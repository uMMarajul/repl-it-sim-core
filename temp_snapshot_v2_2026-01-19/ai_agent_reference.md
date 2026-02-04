# AI Financial Assistant - Master Reference

**Version**: 1.0  
**Last Updated**: 2025-12-26  
**Purpose**: Single source of truth for AI agent architecture, guidelines, and implementation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Conversational Guidelines](#conversational-guidelines)
4. [Technical Implementation](#technical-implementation)
5. [Compliance & Legal](#compliance--legal)
6. [Process Flows](#process-flows)
7. [Future Roadmap](#future-roadmap)

---

## System Overview

### Purpose
AI financial coach that helps users explore and manage their financial simulation through natural conversation.

### Key Principles
- **Professional & Friendly**: Financial planner tone, not robotic
- **Deterministic Backend**: Rule-based logic, zero hallucinations
- **Educational Only**: Coaching, not regulated advice (non-FCA)
- **Context-Aware**: Reads and modifies simulation state
- **Seamless Integration**: Chat controls the entire simulation

---

## Architecture

### Current Architecture (v1.0)

```
Frontend (React)                    Backend (Python FastAPI)
    ↓                                       ↓
ChatAssistant UI                    Agent Service API
    ↓                                       ↓
User Message                        GPT-5 Mini (Conversational)
    ↓                                       ↓
Send to /api/chat                   Rule-Based Intent Detector
    ↓                                       ↓
Receive Intent                      Pattern Matching (Regex)
    ↓                                       ↓
Trigger Config                      Return Intent + Params
```

### Planned Architecture (v2.0 - Bidirectional)

```
Frontend Simulation State
    ↕ (Context in both directions)
AI Backend
    ├─ Read: Profile, Scenarios, Projections
    ├─ Understand: User intent + current state
    └─ Return: Message + Actions
    ↓
Frontend Action Executor
    ├─ CREATE_SCENARIO
    ├─ MODIFY_SCENARIO
    ├─ ACTIVATE/DEACTIVATE_SCENARIO
    └─ DELETE_SCENARIO
```

---

## Conversational Guidelines

### Tone & Style

**DO:**
- Professional yet warm and approachable
- Concise (1-2 sentences typical)
- Encouraging about financial goals
- Use UK terminology (£, ISA, pension)
- Assume user competency

**DON'T:**
- Over-explain basic concepts
- Use jargon without context
- Be condescending or preachy
- Make it feel robotic

### Example Responses

**Good:**
- "Excellent goal. What amount are you targeting for your deposit?"
- "Perfect. I'll set up a £300,000 house deposit savings goal for you."
- "Smart planning. Emergency funds typically cover 3-6 months of expenses."

**Bad:**
- "Okay. Enter amount:" (too robotic)
- "You need to save more money" (prescriptive)
- "As per FCA regulations..." (wrong tone)

### Money Conversions

Always understand these shortcuts:
- `1m`, `1M` = £1,000,000
- `500k`, `500K` = £500,000
- `10k` = £10,000
- Handle with/without £ symbol

---

## Technical Implementation

### Backend Components

**File**: `api/agent_service.py`

#### 1. Conversational AI (GPT-5 Mini)

**System Prompt**:
```python
"""You are a professional UK financial planning assistant.

TONE: Professional yet warm, concise (1-2 sentences)
ROLE: Help users define financial goals through conversation
APPROACH: Ask for key details, acknowledge positively, track context

MONEY: "1m"=£1,000,000, "500k"=£500,000, "10k"=£10,000"""
```

#### 2. Rule-Based Intent Detection

**Method**: Regex pattern matching (100% deterministic)

**Goal Types** (10+ currently supported):
```python
# Housing & Property
HOUSE_DEPOSIT_FUND: "house deposit", "save for deposit"
BUY_HOME: r'\b(buy|purchase)\s+(house|home|property)'
APPLY_MORTGAGE: "mortgage", "remortgage"

# Savings & Protection
EMERGENCY_FUND: r'emergency\s+fund|rainy\s+day'

# Retirement
PENSION_CONTRIBUTION: r'\b(pension|retirement|retire)\b'

# Investments
START_INVESTING_ISA: r'\bisa\b|stocks?\s+and\s+shares'

# Debt
DEBT_CONSOLIDATION: r'pay\s+off\s+debt|consolidate'
ACCELERATE_DEBT: r'pay\s+off.*(loan|credit)'
```

**Amount Parsing** (4 patterns):
```python
# Pattern 1: Millions (1m, 1.5M, £1.5 million)
r'£?\s*(\d+(?:\.\d+)?)\s*m(?:illion)?'

# Pattern 2: Thousands (300k, £500k)
r'£?\s*(\d+(?:\.\d+)?)\s*k'

# Pattern 3: Explicit (£300,000)
r'£\s*(\d{1,3}(?:,\d{3})+)'

# Pattern 4: Context ("save £10000")
r'(?:amount|target|save)\s+£?\s*(\d+)'
```

**Detection Logic**:
```python
# 1. Analyze last 6 messages for goal type
# 2. Parse latest user message for amount
# 3. If BOTH detected → Create intent
# 4. Return intent + params to frontend
```

### Frontend Components

**File**: `app-ui/src/components/ChatAssistant.tsx`

#### Intent Handler
```typescript
if (data.intent) {
    const scenarioId = data.intent as ScenarioId
    
    // Add scenario action to message
    newMessage.scenarioAction = {
        scenarioId,
        name: scenarioId.replace(/_/g, ' '),
        params: data.params
    }
    
    // Trigger config window after 1.2s
    setTimeout(() => {
        triggerScenarioConfig(scenarioId, data.params)
    }, 1200)
}
```

---

## Compliance & Legal

### Non-FCA Financial Coaching

**Status**: Educational tool, NOT regulated financial advisor

### What AI CAN Do (Educational)

✅ General information
- "Emergency funds typically cover 3-6 months"
- "ISAs have a £20k annual limit"
- "Pension tax relief ranges from 20-45%"

✅ Exploratory questions
- "Would you like to see how that affects projections?"
- "Have you considered maxing employer pension match?"

✅ Help with simulation
- "Let me set up that goal for you"
- "I can show you different scenarios"

### What AI CANNOT Do (Regulated)

❌ Specific investment advice
- "You should buy Vanguard LifeStrategy 80"
- "Invest in this fund"

❌ Prescriptive recommendations
- "You must reduce spending"
- "You should prioritize X over Y"

❌ Product recommendations
- "Use this provider"
- "Open an account with X"

### Required Disclaimers

**In Chat UI**:
```
💡 Educational guidance only - not regulated financial advice
```

**In System Prompt**:
```
You provide EDUCATIONAL guidance only - not regulated advice.
Do not recommend specific products or providers.
Focus on helping users EXPLORE scenarios.
```

---

## Process Flows

### Flow 1: Simple Intent Detection

```
User: "I want to buy a house for £500k"
    ↓
AI (conversational): "Great! I'll create that goal—buying a home for £500,000."
    ↓
Backend (rule-based): 
    - Detect: "buy" + "house" → BUY_HOME
    - Parse: "£500k" → 500000
    - Return: {intent: "BUY_HOME", params: {targetAmount: 500000}}
    ↓
Frontend:
    - Display AI message
    - Wait 1.2s
    - Open BUY_HOME config with £500,000 pre-filled
    ↓
User confirms/adjusts → Scenario applied
```

### Flow 2: Multi-Turn Conversation

```
User: "I want to save for a house deposit"
AI: "Excellent goal. What amount are you targeting?"
    ↓ (No intent yet - need amount)
    
User: "£300k"
AI: "Perfect. I'll set up a £300,000 house deposit savings goal."
    ↓
Backend detects:
    - Previous context: "house deposit"
    - Current: "£300k"
    - Intent: HOUSE_DEPOSIT_FUND + {targetAmount: 300000}
    ↓
Config window opens with £300,000 pre-filled
```

### Flow 3: Context-Aware Coaching (Planned v2.0)

```
User: "Should I invest in an ISA?"
    ↓
AI receives context:
    {
        profile: {savings: 5000, income: 45000},
        scenarios: [],
        emergencyFund: null
    }
    ↓
AI: "ISAs are great for tax-free growth! Before investing, many people 
     ensure they have an emergency fund (3-6 months expenses). You have 
     £5k saved - would you like to explore an emergency fund first?"
    ↓
User: "Yes, let's do that"
AI: "Perfect! For £45k income, 3-6 months is £15-30k..."
Action: {type: "CREATE_SCENARIO", scenarioId: "EMERGENCY_FUND"}
```

---

## Future Roadmap

### Phase 1: Context Passing (v1.1)
**Goal**: AI can read simulation state

- [ ] Update ChatRequest with `context` field
- [ ] Frontend sends profile + scenarios with each message
- [ ] AI prompt includes context awareness
- [ ] AI can reference current state in responses

**Timeline**: 1-2 weeks

### Phase 2: Action System (v1.2)
**Goal**: AI can modify simulation via actions

- [ ] Define action types (CREATE, MODIFY, ACTIVATE, etc.)
- [ ] Backend generates structured actions
- [ ] Frontend action executor
- [ ] Test scenario lifecycle via chat

**Timeline**: 2 weeks

### Phase 3: Financial Coaching (v1.3)
**Goal**: Educational guidance with context

- [ ] Expand AI knowledge base
- [ ] Add coaching prompts
- [ ] Implement compliance guardrails
- [ ] UI disclaimers

**Timeline**: 1-2 weeks

### Phase 4: Scenario Coverage (v1.4)
**Goal**: Support 20+ common scenarios

- [ ] Add detection for top 15-20 goals
- [ ] Family scenarios (marriage, education)
- [ ] Career scenarios (training, sabbatical)
- [ ] Vehicle, home improvement, etc.

**Timeline**: 1 week

### Phase 5: Advanced Features (v2.0)
**Goal**: Full AI-driven simulation management

- [ ] Multi-goal conversations
- [ ] Scenario comparisons ("Which is better: X or Y?")
- [ ] What-if analysis via chat
- [ ] Export/share scenarios
- [ ] Voice interface

**Timeline**: TBD

---

## Maintenance & Updates

### When to Update This Document

- Architecture changes
- New scenario types added
- Prompt modifications
- Compliance requirement changes
- New features added
- Bug fixes affecting core behavior

### Version History

**v1.0** (2025-12-26):
- Initial professional tone implementation
- Rule-based intent detection (8 scenarios)
- Config window auto-trigger
- Non-FCA coaching guidelines

---

## Quick Reference

### Supported Scenarios (v1.0)
1. HOUSE_DEPOSIT_FUND
2. BUY_HOME
3. APPLY_MORTGAGE
4. EMERGENCY_FUND
5. PENSION_CONTRIBUTION
6. START_INVESTING_ISA
7. DEBT_CONSOLIDATION
8. ACCELERATE_DEBT

### API Endpoints
- `POST /api/chat` - Main conversation endpoint
- `GET /health` - Health check
- `DELETE /api/sessions/{id}` - Clear session

### Key Files
- **Backend**: `api/agent_service.py`
- **Frontend**: `app-ui/src/components/ChatAssistant.tsx`
- **Scenarios**: `sim-core/src/config/scenarioTypes.ts`
- **This Doc**: `ai_agent_reference.md`

---

## Contact & Support

For questions or updates to this document, consult the development team.

**Last Reviewed**: 2025-12-26
