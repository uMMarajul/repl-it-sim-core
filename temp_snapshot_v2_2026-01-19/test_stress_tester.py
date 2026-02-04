import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_chat(message, mode="events", context=None):
    print(f"\n--- Testing Message: '{message}' (Mode: {mode}) ---")
    
    payload = {
        "message": message,
        "sessionId": "test_stress_session_" + str(int(time.time())),
        "mode": mode,
        "context": context or {}
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        
        print(f"Agent Response: {data.get('message')}")
        
        if data.get('action'):
            print(f"ACTION TRIGGERED: {data['action']['type']}")
            print(f"SCENARIO ID: {data['action'].get('scenarioId')}")
            print(f"PARAMS: {data['action'].get('params')}")
        else:
            print("No action triggered.")
            
        return data
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    # Test 1: Job Loss (Full Params)
    print("\n=== TEST 1: Job Loss ===")
    test_chat("Configure a job loss scenario starting 2026-06-01 for 6 months. Salary is £40k.", mode="events")
    
    # Test 2: Market Crash (Full Params)
    print("\n=== TEST 2: Market Crash ===")
    test_chat("Simulate a market crash in Dec 2026. Drop by 20% for 12 months.", mode="events")

    # Test 3: Unexpected Expense (Full Params)
    print("\n=== TEST 3: Unexpected Expense ===")
    test_chat("I have an unexpected car repair of £2000 due next week (2025-10-01).", mode="events")
