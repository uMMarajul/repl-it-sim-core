import sys
import os

# Add parent directory to path so we can import api modules
sys.path.append(os.path.join(os.getcwd(), 'api'))
sys.path.append(os.getcwd())

from api.prompts import get_contextual_advice

def test_lisa_logic():
    print("Testing LISA Logic...")
    profile = {"age": 25, "income": 30000}
    advice = get_contextual_advice(profile)
    assert "LISA Opportunity" in advice, f"Expected LISA advice for age 25. Got: {advice}"
    print("PASS: LISA Advice generated for Under 40")

    profile_old = {"age": 45, "income": 30000}
    advice_old = get_contextual_advice(profile_old)
    assert "LISA Opportunity" not in advice_old, f"Did not expect LISA advice for age 45. Got: {advice_old}"
    print("PASS: No LISA Advice for Over 40")

def test_pension_logic():
    print("\nTesting Pension Logic...")
    profile = {"age": 45, "income": 60000}
    advice = get_contextual_advice(profile)
    assert "Tax Efficiency" in advice, f"Expected Tax Efficiency advice for £60k. Got: {advice}"
    print("PASS: Higher Rate Tax Advice generated")

def test_savings_logic():
    print("\nTesting Savings Logic...")
    profile_low = {"age": 30, "savings": 1000}
    advice = get_contextual_advice(profile_low)
    assert "Emergency Fund" in advice, "Expected Emergency Fund advice"
    print("PASS: Low Savings warning generated")

    profile_high = {"age": 30, "savings": 30000}
    advice = get_contextual_advice(profile_high)
    assert "ISA Limits" in advice, "Expected ISA Limit advice"
    print("PASS: High Savings advice generated")

if __name__ == "__main__":
    try:
        test_lisa_logic()
        test_pension_logic()
        test_savings_logic()
        print("\nALL TESTS PASSED ✅")
    except AssertionError as e:
        print(f"\nTEST FAILED ❌: {e}")
        exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        exit(1)
