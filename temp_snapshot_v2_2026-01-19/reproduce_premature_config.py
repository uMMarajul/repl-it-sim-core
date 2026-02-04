import requests
import json
import uuid

BASE_URL = "http://localhost:8000/api/chat"
SESSION_ID = f"test_debug_{uuid.uuid4()}"

def send_message(message, mode="goals"):
    payload = {
        "message": message,
        "sessionId": SESSION_ID,
        "mode": mode,
        "context": {"profile": {"name": "Test User"}}
    }
    response = requests.post(BASE_URL, json=payload)
    return response.json()

PHRASES = [
    "I'm planning a wedding",
    "I'm planning to buy a house",
    "I want to pay off some debt",
    "I want to look at my pension contributions"
]

for msg in PHRASES:
    print(f"\n--- Testing: '{msg}' ---")
    resp = send_message(msg)
    print(f"Assistant: {resp['message']}")
    
    if resp.get('action') and resp['action']['type'] == 'OPEN_CONFIG':
        print("❌ PREMATURE CONFIG DETECTED")
    else:
        print("✅ OK: No config action")
