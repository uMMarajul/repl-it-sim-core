"""
Python AI Agent Implementation

Simple Python implementation of the AI agent for backend use.
Calls OpenAI API directly to extract financial profiles.
"""

from openai import OpenAI
from typing import Dict, Any, List, Optional
import json

class AgentResponse:
    def __init__(self, message: str, profile_extracted: Optional[Dict] = None, 
                 profile_complete: bool = False, confidence: float = 0.0,
                 missing_fields: List[str] = []):
        self.message = message
        self.profileExtracted = profile_extracted
        self.profileComplete = profile_complete
        self.confidence = confidence
        self.missingProfileFields = missing_fields

class AIAgent:
    def __init__(self, api_key: str, model: str = "gpt-5-nano"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.sessions: Dict[str, List[Dict]] = {}
    
    def processUserInput(self, message: str, session_id: str) -> AgentResponse:
        """Process user input and extract financial profile"""
        
        # Get or create session history
        if session_id not in self.sessions:
            self.sessions[session_id] = [{
                "role": "system",
                "content": self._get_system_prompt()
            }]
        
        # Add user message
        self.sessions[session_id].append({
            "role": "user",
            "content": message
        })
        
        try:
            # Call OpenAI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.sessions[session_id],
                temperature=0.7
            )
            
            assistant_message = response.choices[0].message.content
            
            # Add assistant response to history
            self.sessions[session_id].append({
                "role": "assistant",
                "content": assistant_message
            })
            
            # For now, just return the message without profile extraction
            # (full profile extraction would require JSON mode and parsing)
            return AgentResponse(
                message=assistant_message,
                profile_extracted=None,
                profile_complete=False,
                confidence=0.8,
                missing_fields=[]
            )
            
        except Exception as e:
            return AgentResponse(
                message=f"I encountered an error: {str(e)}",
                profile_extracted=None,
                profile_complete=False,
                confidence=0.0,
                missing_fields=[]
            )
    
    def _get_system_prompt(self) -> str:
        return """You are a UK financial planning assistant. Help users with:
- ISAs (annual limit £20,000)
- Pensions (annual allowance £60,000)
- House deposits and mortgages
- Emergency funds and savings
- Debt management

Be conversational, friendly, and ask clarifying questions to understand their situation.
Focus on UK-specific financial products and regulations."""

def createAIAgent(api_key: str, model: str = "gpt-5-nano") -> AIAgent:
    """Create AI agent instance"""
    return AIAgent(api_key, model)
