import requests

session_id = "test_combo_123"

messages = [
    "I want to save for a house deposit",
    "300k, 2 years"  # Combined message
]

for i, msg in enumerate(messages, 1):
    print(f"\n{'='*60}")
    print(f"Message {i}: {msg}")
    print('='*60)
    
    r = requests.post('http://localhost:8000/api/chat', json={
        'message': msg,
        'sessionId': session_id
    })
    
    if r.status_code == 200:
        data = r.json()
        print(f"AI: {data['message'][:100]}...")
        print(f"Intent: {data.get('intent')}")
        print(f"Params: {data.get('params')}")
        print(f"Action: {data.get('action')}")
        if data.get('action'):
            print(f"  ✅ ACTION TYPE: {data['action'].get('type')}")
            print(f"  ✅ SCENARIO ID: {data['action'].get('scenarioId')}")
            print(f"  ✅ PARAMS: {data['action'].get('params')}")
    else:
        print(f"ERROR: {r.status_code}")
