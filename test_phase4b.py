
import requests
import json
import sys

# Color codes
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

BASE_URL = "http://127.0.0.1:8000"

def test_chat(prompt, expected_intent="custom_goal", expected_params=None):
    print(f"Testing: '{prompt}'")
    try:
        response = requests.post(f"{BASE_URL}/api/chat", json={"message": prompt})
        data = response.json()
        
        # Check success
        if response.status_code != 200:
            print(f"{RED}FAILED: API {response.status_code}{RESET}")
            print(data)
            return False

        intent = data.get("intent", {}).get("scenario_id") if isinstance(data.get("intent"), dict) else data.get("intent")
        # Handle simple string intent vs object
        
        # In agent_service.py, intent is returned as string in 'intent' field, params in 'params' field.
        # But 'intent' field might be just the scenario ID string.
        
        final_intent = data.get("intent")
        final_params = data.get("params", {})
        
        if final_intent != expected_intent:
            print(f"{RED}FAILED: Intent {final_intent} != {expected_intent}{RESET}")
            return False

        if expected_params:
            for key, val in expected_params.items():
                if str(final_params.get(key, "")).lower() != str(val).lower():
                     print(f"{RED}FAILED: Param {key} got '{final_params.get(key)}', want '{val}'{RESET}")
                     return False
        
        print(f"{GREEN}PASSED{RESET}")
        return True

    except Exception as e:
        print(f"{RED}ERROR: {e}{RESET}")
        return False

def run_tests():
    print("=== PHASE 4b VERIFICATION ===\n")
    
    # 1. Income (Windfall)
    test_chat(
        "I just received a Windfall of 5000 from inheritance",
        expected_params={
            "scenarioName": "Windfall",
            "targetAmount": "5000",
            "direction": "income", # Might map to 'save' if AI not updated?
            # Wait, did I update AI Prompt? 
            # I updated PARAM_MAPPINGS in Phase 4a.
            # I need to ensure AI logic outputs 'direction: income'.
            # If not, I might need to update agent_service.py prompt too?
        }
    )

    # 2. Debt (Loan)
    test_chat(
        "I need to take out a Loan of 10000 for a Car",
        expected_params={
            "scenarioName": "Car", 
            "targetAmount": "10000",
            "direction": "debt"
        }
    )
    
    # 3. Withdrawal
    test_chat(
        "I need to Withdraw 2000 from my savings",
        expected_params={
            "scenarioName": "Withdraw",
            "targetAmount": "2000",
            "direction": "withdraw"
        }
    )

if __name__ == "__main__":
    run_tests()
