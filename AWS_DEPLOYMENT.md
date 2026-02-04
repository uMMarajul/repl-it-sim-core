# Deploying to AWS

## Option 1: AWS App Runner (Recommended - Easiest)

### Prerequisites
- AWS CLI installed and configured (`aws configure`)
- Docker installed

### Steps

1. **Build and push to ECR:**
```bash
# Create ECR repository
aws ecr create-repository --repository-name financial-ai-agent --region us-east-1

# Get login credentials
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t financial-ai-agent .

# Tag and push
docker tag financial-ai-agent:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/financial-ai-agent:latest
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/financial-ai-agent:latest
```

2. **Create App Runner service via AWS Console:**
   - Go to AWS Console → App Runner → Create service
   - Source: Container registry → Amazon ECR
   - Select your image
   - Add environment variables (OPENAI_API_KEY, etc.)
   - Deploy!

---

## Option 2: AWS Lambda + API Gateway (Serverless)

### Install Mangum adapter
```bash
pip install mangum
```

### Update your code (add to agent_service.py):
```python
from mangum import Mangum
handler = Mangum(app)
```

### Deploy with AWS SAM:
```bash
pip install aws-sam-cli
sam init  # Choose Python + API Gateway
sam deploy --guided
```

---

## Option 3: Elastic Beanstalk (Traditional)

1. **Create Procfile:**
```
web: uvicorn api.agent_service:app --host 0.0.0.0 --port $PORT
```

2. **Deploy:**
```bash
pip install awsebcli
eb init -p python-3.11 financial-ai-agent
eb create production
eb deploy
```

---

## Option 4: ECS Fargate (Production-ready)

Use the Dockerfile above with:
```bash
# Create cluster and deploy
aws ecs create-cluster --cluster-name financial-ai-cluster
# Use AWS Console or Copilot CLI for easier setup:
brew install aws/tap/copilot-cli
copilot init
copilot deploy
```

---

## Quick Start: AWS Copilot (Recommended for ECS)

The easiest way if you want production-ready ECS:

```bash
# Install Copilot CLI
brew install aws/tap/copilot-cli

# Initialize and deploy
copilot init --app financial-ai --name api --type "Request-Driven Web Service" --dockerfile ./Dockerfile
copilot deploy
```

This handles VPC, load balancers, auto-scaling, and HTTPS automatically!

---

## Environment Variables

Make sure to set these in your AWS service:
- `OPENAI_API_KEY` - Your OpenAI API key
- Any other variables from your `.env` file

---

## Recommended: App Runner or Copilot

For your use case (FastAPI + simple deployment), I recommend:
1. **App Runner** - Simplest, pay-per-use, auto-scaling
2. **Copilot CLI** - More control, still easy, production-ready
