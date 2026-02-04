# Financial AI Agent API - Node.js

A Node.js/Express conversion of the Python FastAPI financial AI agent service.

## Features

- 🤖 AI-powered financial planning assistant
- 💬 Context-aware conversation handling
- 🎯 Pattern-based scenario detection (55+ financial scenarios)
- 🏦 UK-specific financial knowledge base
- 🔄 Session management with persistence
- ☁️ Supports both OpenAI and Azure OpenAI

## Project Structure

```
api-nodejs/
├── src/
│   ├── server.js         # Express server & API endpoints
│   ├── aiAgent.js        # AI Agent implementation
│   ├── prompts.js        # System prompts by persona mode
│   └── patternMatcher.js # Scenario pattern matching engine
├── data/
│   ├── scenario_patterns.json   # 55 scenario keyword patterns
│   └── financial_knowledge.json # UK financial knowledge base
├── package.json
├── .env.example
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
cd api-nodejs
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:8000`

## API Endpoints

### `GET /`
Returns service info and status.

### `GET /health`
Health check endpoint.

### `POST /api/chat`
Main chat endpoint for AI assistant.

**Request Body:**
```json
{
  "message": "I want to buy a house for £300k",
  "sessionId": "optional-session-id",
  "context": {
    "profile": { "name": "John", "age": 30, "income": 50000 },
    "activeScenarios": [],
    "solvency": { "isSolvent": true, "monthlySurplus": 500 }
  },
  "mode": "goals"
}
```

**Response:**
```json
{
  "message": "Great choice! When are you planning to purchase?",
  "sessionId": "abc123",
  "intent": "buy_home",
  "params": { "propertyPrice": 300000 },
  "action": {
    "type": "OPEN_CONFIG",
    "scenarioId": "buy_home",
    "params": { "propertyPrice": 300000 }
  }
}
```

### `DELETE /api/sessions/:sessionId`
Clear a conversation session.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes (or Azure) |
| `OPENAI_MODEL` | Model name (default: gpt-4o-mini) | No |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | Yes (or Standard) |
| `AZURE_OPENAI_ENDPOINT` | Azure endpoint URL | With Azure |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Azure deployment name | With Azure |
| `PORT` | Server port (default: 8000) | No |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | No |

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

### AWS Elastic Beanstalk

1. Create Procfile: `web: npm start`
2. `eb init && eb create && eb open`

### AWS Lambda (with adapter)

Use `@vendia/serverless-express` adapter.

## License

MIT
