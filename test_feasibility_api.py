import requests
import json
import uuid

def test_feasibility_warning():
    session_id = str(uuid.uuid4())
    url = "http://localhost:8000/api/chat"
    
    # 1. Simulate a context where the user is INSOLVENT
    # This mimics what the frontend sends after running the simulation
    simulation_context = {
        "profile": {
            "name": "Test User",
            "age": 30,
            "income": 30000,
            "savings": 0
        },
        "activeScenarios": [
            {
                "id": "marriage",
                "type": "marriage",
                "params": {
                    "targetAmount": 150000,
                    "targetDate": "2025-01-01"
                }
            }
        ],
        "solvency": {
            "isSolvent": False,
            "maxDeficit": 145000,
            "firstDeficitDate": "Jan 2025",
            "monthlySurplus": 200
        }
    }
    
    payload = {
        "message": "I want to have a wedding costing £150k next year.",
        "sessionId": session_id,
        "context": simulation_context,
        "mode": "goals"
    }
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        print("\n--- AI Response ---")
        print(data["message"])
        print("-------------------\n")
        
        message_lower = data["message"].lower()
        
        # Validation checks
        has_warning = "warn" in message_lower or "overdraft" in message_lower or "debt" in message_lower or "insolvent" in message_lower or "can't afford" in message_lower or "looks like it might push you into overdraft" in message_lower
        mentions_surplus = "200" in data["message"]
        
        if has_warning:
            print("✅ PASS: AI warned about insolvency.")
        else:
            print("❌ FAIL: AI did not warn about insolvency.")
            
        if mentions_surplus:
            print("✅ PASS: AI mentioned the monthly surplus.")
        else:
            print("❌ FAIL: AI did not mention the surplus.")

    except Exception as e:
        print(f"❌ Error: {e}")

    with open("test_output.txt", "w") as f:
        if has_warning:
            f.write("PASS: AI warned about insolvency.\n")
        else:
            f.write(f"FAIL: AI did not warn. Message: {data['message']}\n")
            
        if mentions_surplus:
            f.write(f"PASS: AI mentioned surplus. Message: {data['message']}\n")
        else:
            f.write(f"FAIL: AI did not mention surplus.\n")

if __name__ == "__main__":
    test_feasibility_warning()
