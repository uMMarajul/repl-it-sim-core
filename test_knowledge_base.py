import sys
import os
import json

# Add parent directory to path so we can import api modules
sys.path.append(os.path.join(os.getcwd(), 'api'))
sys.path.append(os.getcwd())

from api.prompts import get_system_prompt

def load_kb_string():
    """Simulate the loading logic from agent_service.py"""
    kb_str = []
    try:
        with open('api/financial_knowledge.json', 'r') as f:
            kb_data = json.load(f)
            for topic, info in kb_data.items():
                source = f" (Source: {info.get('source', 'Unknown')})" if info.get('source') else ""
                kb_str.append(f"{topic}: {info.get('coach_tip', '')} (Fact: {info.get('limit', '')} {info.get('tax_relief', '')}){source}")
        return "\\n".join(kb_str)
    except Exception as e:
        print(f"Error loading KB: {e}")
        return ""

def test_knowledge_base_injection():
    print("Testing Knowledge Base Injection...")
    
    # 1. Load the KB string
    financial_kb_prompt = load_kb_string()
    assert "ISA" in financial_kb_prompt, "KB string missing 'ISA' topic"
    assert "£20,000" in financial_kb_prompt, "KB string missing ISA limit"
    print("PASS: KB String loaded correctly")

    # 2. Generate System Prompt
    system_prompt = get_system_prompt(
        mode='goals',
        financial_kb=financial_kb_prompt, 
        scenario_kb="",
        profile={"name": "Test User"}
    )
    
    # 3. Check for Injection
    assert "FINANCIAL KNOWLEDGE BASE:" in system_prompt, "System Prompt missing KB section header"
    assert "ISA (Individual Savings Account):" in system_prompt, "System Prompt missing KB content"
    print("PASS: KB injected into System Prompt")

if __name__ == "__main__":
    try:
        test_knowledge_base_injection()
        print("\nALL TESTS PASSED ✅")
    except AssertionError as e:
        print(f"\nTEST FAILED ❌: {e}")
        exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        exit(1)
