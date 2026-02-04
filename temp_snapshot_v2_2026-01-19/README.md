# Financial Planning Simulation & AI Agent 🤖

A comprehensive financial planning tool with an intelligent AI Assistant that helps users configure complex financial scenarios through natural conversation.

## Features

- **Interactive Financial Simulation**: Real-time projection of net worth, cash flow, and scenario impacts.
- **AI Agent Coach**: Multi-persona AI (Goal Setter, Health Optimizer, Stress Tester) that guides users.
- **Universal Scenario Logic**: Supports 55+ distinct financial scenarios (Mortgages, ISAs, Events).
- **Context-Aware**: AI understands your current profile and simulation state.

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Backend Setup
```bash
# Install dependencies
pip install fastapi uvicorn openai python-dotenv

# Run the API server
python -m uvicorn api.agent_service:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd app-ui
npm install
npm run dev
```

Open [http://localhost:5001](http://localhost:5001) in your browser.

## AI Configuration

You can use either **Standard OpenAI** or **Azure OpenAI**.
Create a `.env` file in the root directory:

### Option 1: Standard OpenAI
```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

### Option 2: Azure OpenAI (Enterprise)
```env
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

## Verification
To verify the AI logic and scenario patterns:

```bash
# Test intent detection and "What-If" logic
python test_stress_tester.py
```
