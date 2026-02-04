import requests
import json

# Test 1: Simple message without context
print("=" * 60)
print("TEST 1: Simple message (no context)")
print("=" * 60)

r1 = requests.post('http://localhost:8000/api/chat', json={
    'message': 'I want to save for a house deposit'
})

print(f"Status: {r1.status_code}")
if r1.status_code == 200:
    data = r1.json()
    print(f"AI Response: {data.get('message', 'NO MESSAGE')}")
    print(f"Intent: {data.get('intent')}")
else:
    print(f"Error: {r1.text}")

print("\n")

# Test 2: Message WITH context (profile + scenarios)
print("=" * 60)
print("TEST 2: Message with user context")
print("=" * 60)

context = {
    'profile': {
        'name': 'Alpha',
        'age': 28,
        'income': 45000,
        'savings': 10000
    },
    'activeScenarios': [
        {
            'type': 'EMERGENCY_FUND',
            'params': {'targetAmount': 15000},
            'status': 'active'
        }
    ]
}

r2 = requests.post('http://localhost:8000/api/chat', json={
    'message': 'How am I doing on my emergency fund?',
    'context': context
})

print(f"Status: {r2.status_code}")
if r2.status_code == 200:
    data = r2.json()
    print(f"AI Response: {data.get('message', 'NO MESSAGE')}")
    print(f"Intent: {data.get('intent')}")
    print(f"Action: {data.get('action')}")
else:
    print(f"Error: {r2.text}")

print("\n✅ Test complete!")
