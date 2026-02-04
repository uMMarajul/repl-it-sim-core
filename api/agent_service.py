"""
AI Agent Backend API

FastAPI service that handles LLM calls for the financial simulation AI agent.
Keeps OpenAI API key secure on the backend.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Financial AI Agent API", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5001", "http://localhost:5173", "http://localhost:5005", "https://localhost:3000", "https://test.moola-money.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (for demo - use Redis/DB in production)
sessions: Dict[str, List[Dict[str, Any]]] = {}

#############################################
# AI Agent Implementation (inline)
#############################################

from openai import OpenAI, AzureOpenAI

from .prompts import get_system_prompt

class AgentResponse:
    def __init__(self, message: str, profile_extracted: Optional[Dict] = None, 
                 profile_complete: bool = False, confidence: float = 0.0,
                 missing_fields: List[str] = [], intent: Optional[str] = None,
                 params: Optional[Dict] = None, customScenario: Optional[Dict] = None,
                 action: Optional['ScenarioAction'] = None):
        self.message = message
        self.profileExtracted = profile_extracted
        self.profileComplete = profile_complete
        self.confidence = confidence
        self.missingProfileFields = missing_fields
        self.intent = intent
        self.params = params
        self.customScenario = customScenario
        self.action = action

class AIAgent:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", azure_endpoint: str = None, api_version: str = "2024-02-15-preview"):
        if azure_endpoint:
            print(f"[AIAgent] Using Azure OpenAI: {azure_endpoint}")
            self.client = AzureOpenAI(
                api_key=api_key,
                api_version=api_version,
                azure_endpoint=azure_endpoint
            )
        else:
            print("[AIAgent] Using Standard OpenAI")
            self.client = OpenAI(api_key=api_key)
            
        self.model = model
        self.model = model
        self.sessions: Dict[str, List[Dict]] = {}
        self.session_file = "sessions.json"
        
        # Load persisted sessions if available
        try:
            import json
            if os.path.exists(self.session_file):
                with open(self.session_file, 'r') as f:
                    self.sessions = json.load(f)
                    print(f"[AIAgent] Loaded {len(self.sessions)} sessions from disk")
        except Exception as e:
            print(f"[AIAgent] Error loading sessions: {e}")
        
        # Load knowledge base once at startup
        self.knowledge_base_prompt = ""
        try:
            import json
            with open('api/scenario_patterns.json', 'r') as f:
                data = json.load(f)
                kb_lines = []
                for theme, scenarios in data.items():
                    for sid, sdata in scenarios.items():
                        params = sdata.get('params', [])
                        kb_lines.append(f"- {sid}: {params}")
                self.knowledge_base_prompt = "\\n".join(kb_lines)
        except Exception as e:
            print(f"Error loading knowledge base: {e}")

        # Load financial knowledge base
        self.financial_kb_prompt = ""
        try:
             with open('api/financial_knowledge.json', 'r') as f:
                 kb_data = json.load(f)
                 kb_str = []
                 for topic, info in kb_data.items():
                     source = f" (Source: {info.get('source', 'Unknown')})" if info.get('source') else ""
                     kb_str.append(f"{topic}: {info.get('coach_tip', '')} (Fact: {info.get('limit', '')} {info.get('tax_relief', '')}){source}")
                 self.financial_kb_prompt = "\\n".join(kb_str)
        except Exception as e:
            print(f"Error loading financial KB: {e}")

    async def processUserInput(self, user_input: str, session_id: str = "default", context: Dict = None, mode: str = "goals"):
        """
        Process user input with simulation context awareness
        
        Args:
            user_input: User's message
            session_id: Session identifier
            context: Simulation state (profile, scenarios, projections)
            mode: Conversation mode (goals, health, events)
        """
        try:
            # Get or create session history
            if session_id not in self.sessions:
                from datetime import datetime
                system_prompt = get_system_prompt(
                    mode=mode,
                    financial_kb=self.financial_kb_prompt,
                    scenario_kb=self.knowledge_base_prompt,
                    profile=context.get('profile', {}),
                    current_date=datetime.now().strftime("%Y-%m-%d")
                )
                
                self.sessions[session_id] = [{
                    "role": "system",
                    "content": system_prompt
                }]
            
            # Build context-aware prompt if context provided
            context_prompt = ""
            if context:
                profile = context.get('profile', {})
                scenarios = context.get('activeScenarios', [])
                
                if profile:
                    context_prompt = f"\n\nCURRENT USER CONTEXT:\n"
                    if profile.get('name'):
                        context_prompt += f"Name: {profile['name']}\n"
                    if profile.get('age'):
                        context_prompt += f"Age: {profile['age']}\n"
                    if profile.get('income'):
                        context_prompt += f"Annual Income: £{profile['income']:,}\n"
                    if profile.get('savings'):
                        context_prompt += f"Current Savings: £{profile['savings']:,}\n"
                
                # NEW: Add Solvency Metrics
                solvency = context.get('solvency')
                if solvency:
                    is_solvent = solvency.get('isSolvent', True)
                    context_prompt += "\nFINANCIAL HEALTH CHECK:\n"
                    if not is_solvent:
                        max_deficit = solvency.get('maxDeficit', 0)
                        first_deficit = solvency.get('firstDeficitDate')
                        context_prompt += f"⚠️ INSOLVENCY ALERT: User runs out of money (Deficit: £{max_deficit:,.0f}).\n"
                        if first_deficit:
                             context_prompt += f"   - Bankruptcy projected around: {first_deficit}\n"
                    else:
                         context_prompt += "✅ Solvency Check: PASS (Plan is sustainable)\n"
                    
                    monthly_surplus = solvency.get('monthlySurplus', 0)
                    context_prompt += f"   - Avg Monthly Surplus: £{monthly_surplus:,.0f}\n"

                if scenarios:
                    context_prompt += f"\nActive Goals ({len(scenarios)}):\n"
                    for s in scenarios[:5]:  # Limit to 5 to avoid token bloat
                        context_prompt += f"- {s.get('type', 'Unknown')}: {s.get('params', {})}\n"
            
            # Add context as system message if present
            if context_prompt:
                self.sessions[session_id].append({
                    "role": "system",
                    "content": context_prompt
                })
            
            # Add user message
            self.sessions[session_id].append({
                "role": "user",
                "content": user_input
            })
            
            # Call OpenAI (temperature=0 for strict schema compliance)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.sessions[session_id],
                temperature=0.0
            )
            
            assistant_message = response.choices[0].message.content
            
            # DELETED: self.sessions[session_id].append({"role": "assistant", "content": assistant_message})
            # We append the CLEANED message (or fallback) at the end of the function to avoid duplication.

            # Save sessions to disk
            try:
                import json
                with open(self.session_file, 'w') as f:
                    json.dump(self.sessions, f, indent=2)
            except Exception as e:
                print(f"[AIAgent] Error saving sessions: {e}")
            
            # ============================================================
            # PATTERN-BASED INTENT DETECTION (All 55 Scenarios)
            # Uses maintainable JSON keyword library instead of hardcoded regex
            # ============================================================
            
            import re
            from .pattern_matcher import get_matcher
            
            intent_scenario = None
            intent_params = {}
            custom_scenario = None
            clean_message = assistant_message
            
            # Get recent conversation history for this session
            recent_messages = self.sessions.get(session_id, [])
            print(f"[DEBUG] Session {session_id} has {len(recent_messages)} messages")
            
            user_messages = [m["content"].lower() for m in recent_messages if m["role"] == "user"]
            
            print(f"[DEBUG] User messages: {user_messages}")
            
            # NEW: Use pattern matcher for scenario detection
            matcher = get_matcher()
            match_result = matcher.match_scenario(
                text=user_input,
                conversation_history=user_messages
            )
            
            if match_result:
                goal_type, confidence = match_result
                print(f"[PATTERN MATCH] Detected scenario: {goal_type} (confidence: {confidence:.2f})")
            else:
                goal_type = None
                print("[NO MATCH] No scenario pattern matched")

            
            
            # RULE 2: Extract amount from ALL user messages (most recent first)
            amount = None
            if user_messages:
                # Check all user messages, most recent first
                for user_msg in reversed(user_messages):
                    # Pattern 1: Millions (1m, 1.5M, £1m, £1.5 million)
                    if match := re.search(r'£?\s*(\d+(?:\.\d+)?)\s*m(?:illion)?', user_msg, re.I):
                        amount = int(float(match.group(1)) * 1000000)
                        break
                    
                    # Pattern 2: Thousands (300k, £300k, 300K)
                    elif match := re.search(r'£?\s*(\d+(?:\.\d+)?)\s*k', user_msg, re.I):
                        amount = int(float(match.group(1)) * 1000)
                        break
                    
                    # Pattern 3: Explicit pounds with commas (£300,000 or £1,500,000)
                    elif match := re.search(r'£\s*(\d{1,3}(?:,\d{3})+)', user_msg):
                        amount = int(match.group(1).replace(',', ''))
                        break
                    
                    # Pattern 4: Plain numbers with context (if preceded by amount/target/save)
                    elif match := re.search(r'(?:amount|target|save|need)\s+(?:of\s+)?£?\s*(\d+(?:,\d{3})*)', user_msg):
                        amount = int(match.group(1).replace(',', ''))
                        break
            
            if amount:
                print(f"[AMOUNT FOUND] £{amount:,} detected in conversation")
            
            action = None
            
            # RULE 3: Check for AI-generated tags (PRIORITY)
            intent_match = re.search(r'\[INTENT:([^\]]+)\]', assistant_message)
            if intent_match:
                # Parse AI tag (highest priority)
                intent_data = intent_match.group(1)
                parts = intent_data.split('|')
                intent_scenario = parts[0]
                
                for part in parts[1:]:
                    if ':' in part:
                        key, value = part.split(':', 1)
                        key = key.strip()
                        value = value.strip()
                        try:
                            # Handle date strings vs numbers with suffixes
                            val_str = value.lower().strip()
                            if '-' in value and len(value) == 10:
                                intent_params[key] = value
                            elif val_str.endswith('k'):
                                intent_params[key] = int(float(val_str[:-1]) * 1000)
                            elif val_str.endswith('m'):
                                intent_params[key] = int(float(val_str[:-1]) * 1000000)
                            elif '.' in value:
                                intent_params[key] = float(value)
                            else:
                                intent_params[key] = int(value)
                        except ValueError:
                            intent_params[key] = value
                
                clean_message = re.sub(r'\s*\[INTENT:[^\]]+\]', '', assistant_message).strip()
                print(f"[INTENT TAG] Parsed: {intent_scenario} params={intent_params}")
                
                # DEFINITIONS: Parameter Mappings (Generic -> Specific)
                # Supports String (for single targetAmount mapping) or Dict (for direct key mapping)
                PARAM_MAPPINGS = {
                    'childbirth': 'oneOffCosts',
                    'buy_vehicle': 'totalCost',
                    'custom_goal': {'name': 'scenarioName', 'target_amount': 'targetAmount', 'monthly_amount': 'monthlyAmount', 'type': 'direction', 'frequency': 'frequency', 'date': 'targetDate'},
                    'buy_home': {
                        'property_price': 'propertyPrice', 
                        'deposit_amount': 'depositAmount', 
                        'purchase_date': 'purchaseDate', 
                        'targetAmount': 'propertyPrice',
                        'amount': 'propertyPrice',
                        'price': 'propertyPrice',
                        'cost': 'propertyPrice',
                        'date': 'purchaseDate'
                    },
                    'marriage': {
                        'totalBudget': 'totalBudget', 
                        'targetAmount': 'totalBudget',
                        'amount': 'totalBudget',
                        'cost': 'totalBudget',
                        'budget': 'totalBudget',
                        'value': 'totalBudget',
                        'date': 'weddingDate',
                        'weddingDate': 'weddingDate'
                    },
                    'medical_emergency': {'totalCost': 'totalCost', 'targetAmount': 'totalCost', 'amount': 'totalCost', 'cost': 'totalCost'},
                    'tax_bill': {'billAmount': 'billAmount', 'targetAmount': 'billAmount', 'amount': 'billAmount'},
                    'home_improvement': {'totalCost': 'totalCost', 'targetAmount': 'totalCost', 'amount': 'totalCost', 'cost': 'totalCost'},
                    'ivf_treatment': {'totalCost': 'totalCost', 'targetAmount': 'totalCost', 'amount': 'totalCost'},
                    'help_family': 'monthlyAmount',
                    'elder_care': 'monthlyAmount',
                    'divorce': 'settlementCost',
                    'death_partner': 'monthlyIncomeLost',
                    'work_equipment': 'totalCost',
                    'debt_consolidation': 'lumpSumPayment',
                    'sell_asset': 'saleProceeds',
                    'windfall': 'lumpSumAmount',
                    'start_business': 'investmentAmount',
                    'property_repair': 'repairCost'
                }
                
                # 1. Apply SPECIFIC mappings first (preventing overwrite by normalization)
                if intent_scenario in PARAM_MAPPINGS:
                    mapping = PARAM_MAPPINGS[intent_scenario]
                    if isinstance(mapping, dict):
                         # Direct Multi-Key Mapping
                         for ai_key, target_key in mapping.items():
                             if ai_key in intent_params:
                                 intent_params[target_key] = intent_params.pop(ai_key)
                                 print(f"[MAPPING] Direct Map {ai_key} -> {target_key}")

                # 2. Generic Normalization (Convert synonyms to targetAmount)
                # Only if targetAmount doesn't already exist (and wasn't just mapped)
                if 'targetAmount' not in intent_params:
                    GENERIC_KEYS = ['amount', 'cost', 'value', 'price', 'total', 'settlement_amount', 'total_settlement_cost', 'monthly_income_lost', 'lost_income']
                    found_generic_key = next((k for k in GENERIC_KEYS if k in intent_params), None)
                    if found_generic_key:
                        intent_params['targetAmount'] = intent_params.pop(found_generic_key)
                        print(f"[NORMALIZATION] Mapped {found_generic_key} -> targetAmount")

                # 3. Apply SINGLE mapping (if applicable and strictly string-based)
                if intent_scenario in PARAM_MAPPINGS:
                    mapping = PARAM_MAPPINGS[intent_scenario]
                    if isinstance(mapping, str) and 'targetAmount' in intent_params:
                         intent_params[mapping] = intent_params.pop('targetAmount')
                         print(f"[MAPPING] Mapped targetAmount -> {mapping}")
                
                # Generate action from tag
                
                # Generate action from tag
                action = ScenarioAction(
                    type="OPEN_CONFIG",
                    scenarioId=intent_scenario,
                    params=intent_params
                )
            
            # RULE 4: Regex-based Fallback (If no tag detected)
            # CRITICAL FIX: Only trigger fallback if AI is NOT asking a question
            if not action and goal_type and amount and "?" not in assistant_message:
                intent_scenario = goal_type
                intent_params = {"targetAmount": amount}
                
                # Apply validation mapping here too
                PARAM_MAPPINGS = {
                    'childbirth': 'oneOffCosts',
                    'buy_vehicle': 'totalCost',
                    'buy_home': 'propertyPrice',
                    'marriage': 'totalBudget',
                    'medical_emergency': 'totalCost',
                    'tax_bill': 'billAmount',
                    'home_improvement': 'totalCost',
                    'work_equipment': 'totalCost'
                }
                if intent_scenario in PARAM_MAPPINGS:
                     intent_params[PARAM_MAPPINGS[intent_scenario]] = intent_params.pop('targetAmount')

                print(f"[REGEX FALLBACK] Goal: {goal_type}, Amount: £{amount:,}")
                
                action = ScenarioAction(
                    type="OPEN_CONFIG",
                    scenarioId=goal_type,
                    params=intent_params
                )
                print(f"[ACTION GENERATED] {action.type} for {goal_type}")
            
            # Add assistant response to history (without any tags)
            if clean_message:
                self.sessions[session_id].append({
                    "role": "assistant",
                    "content": clean_message
                })
            elif action:
                # Fallback if AI only returned a tag
                clean_message = "I've prepared that for you."
                self.sessions[session_id].append({
                    "role": "assistant",
                    "content": clean_message
                })
            
            # Return response with deterministically detected intent and action
            return AgentResponse(
                message=clean_message,
                profile_extracted=None,
                profile_complete=False,
                confidence=0.9 if (intent_scenario and intent_params) else 0.0,
                missing_fields=[],
                intent=intent_scenario,
                params=intent_params if intent_params else None,
                customScenario=custom_scenario,
                action=action  # NEW: Action to execute
            )
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return AgentResponse(
                message=f"I encountered an error: {type(e).__name__} - {str(e)}",
                profile_extracted=None,
                profile_complete=False,
                confidence=0.0,
                missing_fields=[]
            )

def createAIAgent(api_key: str, model: str = "gpt-5-nano") -> AIAgent:
    """Create AI agent instance"""
    return AIAgent(api_key, model)

###############################################
# API Endpoints
###############################################


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    context: Optional[Dict[str, Any]] = None  # NEW: Simulation state context
    mode: Optional[str] = "goals" # NEW: Conversation mode default

class ScenarioAction(BaseModel):
    type: str  # CREATE_SCENARIO, MODIFY_SCENARIO, ACTIVATE_SCENARIO, DEACTIVATE_SCENARIO, DELETE_SCENARIO, OPEN_CONFIG
    scenarioId: str
    params: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    message: str
    sessionId: str
    profileExtracted: Optional[Dict[str, Any]] = None
    profileComplete: bool = False
    confidence: float = 0.0
    missingFields: List[str] = []
    intent: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    customScenario: Optional[Dict[str, Any]] = None
    action: Optional[ScenarioAction] = None  # NEW: Actions to execute
    guidance: Optional[str] = None  # NEW: Educational insights

@app.get("/")
async def root():
    return {
        "service": "Financial AI Agent API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    api_key = os.getenv("OPENAI_API_KEY")
    return {
        "status": "healthy",
        "api_key_configured": bool(api_key)
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint for AI assistant
    Now accepts simulation context for context-aware responses
    """
    try:
        # Extract request data
        user_message = request.message
        session_id = request.sessionId or str(uuid.uuid4())
        context = request.context or {}
        
        # Log context for debugging
        if context:
            print(f"[CONTEXT] Profile: {context.get('profile', {}).get('name', 'Unknown')}")
            print(f"[CONTEXT] Active scenarios: {len(context.get('activeScenarios', []))}")
        
        # Get or create AI agent
        if not hasattr(app.state, 'ai_agent'):
            # Check for Azure or Standard OpenAI
            azure_key = os.getenv("AZURE_OPENAI_API_KEY")
            azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
            azure_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
            azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
            
            standard_key = os.getenv("OPENAI_API_KEY")
            
            if azure_key and azure_endpoint:
                print(f"[INIT] Configuring Azure OpenAI (Deployment: {azure_deployment})")
                app.state.ai_agent = AIAgent(
                    api_key=azure_key,
                    model=azure_deployment or "gpt-4o-mini",
                    azure_endpoint=azure_endpoint,
                    api_version=azure_version
                )
            elif standard_key:
                print("[INIT] Configuring Standard OpenAI")
                model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                app.state.ai_agent = AIAgent(api_key=standard_key, model=model)
            else:
                raise ValueError("No API Key found! Set AZURE_OPENAI_API_KEY or OPENAI_API_KEY.")
        
        # Process message with context (note: processUserInput is now async)
        response_obj = await app.state.ai_agent.processUserInput(
            user_message, 
            session_id,
            context,
            mode=request.mode or "goals" # NEW: Pass mode
        )
        
        # Build response
        return ChatResponse(
            message=response_obj.message,
            sessionId=session_id,
            profileExtracted=response_obj.profileExtracted if hasattr(response_obj, 'profileExtracted') else None,
            profileComplete=response_obj.profileComplete if hasattr(response_obj, 'profileComplete') else False,
            confidence=response_obj.confidence if hasattr(response_obj, 'confidence') else 0.0,
            missingFields=response_obj.missingProfileFields if hasattr(response_obj, 'missingProfileFields') else [],
            intent=response_obj.intent if hasattr(response_obj, 'intent') else None,
            params=response_obj.params if hasattr(response_obj, 'params') else None,
            customScenario=response_obj.customScenario if hasattr(response_obj, 'customScenario') else None,
            action=response_obj.action if hasattr(response_obj, 'action') else None  # NEW
        )
        
        # Debug: Log what we're returning
        print(f"[API RESPONSE] Returning action: {response_obj.action if hasattr(response_obj, 'action') else 'NO ACTION ATTR'}")
        
        return chat_response
        
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import AI agent modules: {str(e)}"
        )
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Chat processing failed: {str(e)}\n{traceback.format_exc()}"
        )

@app.delete("/api/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear a conversation session"""
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "cleared", "sessionId": session_id}
    return {"status": "not_found", "sessionId": session_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
