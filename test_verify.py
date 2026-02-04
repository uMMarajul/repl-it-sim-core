import requests
import json

url = "http://localhost:8000/api/chat"
payload = {
    "message": "What is the ISA limit and where did you get that info from?",
    "sessionId": "test_verify"
}
headers = {'Content-Type': 'application/json'}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(e)
