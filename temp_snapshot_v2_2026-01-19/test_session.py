import requests
import json

print("Testing backend with SESSION continuity...")
print("=" * 60)

# Use a fixed session ID to maintain context
session_id = "test_session_123"

messages = [
    "I want to save for a house deposit",
    "300k"
]

for i, msg_text in enumerate(messages, 1):
    print(f"\nMessage {i}: {msg_text}")
    r = requests.post('http://localhost:8000/api/chat', json={
        'message': msg_text,
        'sessionId': session_id  # Keep same session!
    })
    
    if r.status_code == 200:
        data = r.json()
        print(f"  AI: {data['message'][:80]}...")
        print(f"  Intent: {data.get('intent')}")
        print(f"  Params: {data.get('params')}")
        print(f"  Action: {data.get('action')}")
        if data.get('action'):
            print(f"    ✅ ACTION GENERATED!")
            print(f"    → Type: {data['action'].get('type')}")
            print(f"    → ScenarioId: {data['action'].get('scenarioId')}")
            print(f"    → Params: {data['action'].get('params')}")
    else:
        print(f"  ERROR: {r.status_code}")

print("\n" + "=" * 60)
