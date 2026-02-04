import requests
import json
import uuid

BASE_URL = "http://localhost:8000/api/chat"
SESSION_ID = f"test_session_{uuid.uuid4()}"

def send_message(message, mode="goals"):
    payload = {
        "message": message,
        "sessionId": SESSION_ID,
        "mode": mode,
        "context": {"profile": {"name": "Test User"}}
    }
    try:
        response = requests.post(BASE_URL, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Server Response: {e.response.text}")
        return None

print(f"Starting Context Test with Session ID: {SESSION_ID}")

# 1. First Message: Setup
msg1 = "I'm planning a wedding"
print(f"\nUser: {msg1}")
resp1 = send_message(msg1)
if resp1:
    print(f"Assistant: {resp1.get('message')}")

# 2. Second Message: Context Dependent
msg2 = "150k"
print(f"\nUser: {msg2}")
resp2 = send_message(msg2)
if resp2:
    print(f"Assistant: {resp2.get('message')}")
    
    # Check Result
    assistant_msg = resp2.get('message', '')
    if "Could you clarify" in assistant_msg or "purchase, savings goal" in assistant_msg:
         print("\n❌ TEST FAILED: Context lost (Amnesia detected)")
    elif "150,000" in assistant_msg or "budget" in assistant_msg.lower():
         print("\n✅ TEST PASSED: Context retained")
    else:
         print("\n⚠️ TEST INCONCLUSIVE: Check response manually")
