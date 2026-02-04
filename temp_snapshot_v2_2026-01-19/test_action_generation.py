import requests
import json

print("Testing backend action generation...")
print("=" * 60)

# Test: "I want to save for a house deposit" then "300k"
messages = [
    {"message": "I want to save for a house deposit"},
    {"message": "300k"}
]

for i, msg in enumerate(messages, 1):
    print(f"\nMessage {i}: {msg['message']}")
    r = requests.post('http://localhost:8000/api/chat', json=msg)
    
    if r.status_code == 200:
        data = r.json()
        print(f"  AI: {data['message'][:80]}...")
        print(f"  Intent: {data.get('intent')}")
        print(f"  Action: {data.get('action')}")
        if data.get('action'):
            print(f"    → Type: {data['action'].get('type')}")
            print(f"    → ScenarioId: {data['action'].get('scenarioId')}")
            print(f"    → Params: {data['action'].get('params')}")
    else:
        print(f"  ERROR: {r.status_code}")

print("\n" + "=" * 60)
print("✅ Test complete!")
