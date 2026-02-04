
import { evaluateRules } from './src/agents/rulesEngine';
import { ISA_MAXIMIZE, PENSION_YOUNG_PROFESSIONAL } from './src/agents/ruleDefinitions';
import { RuleContext, UserProfile } from './src/agents/types';

// Mock Profile
const mockProfile: UserProfile = {
    age: 30,
    retirementAge: 65,
    currentSalary: 60000, // Should trigger ISA logic
    monthlyExpenses: 2000,
    savingsBalance: 50000,
    isaBalance: 10000,
    pensionBalance: 20000,
    hasEmergencyFund: true,
    riskTolerance: 'medium'
};

const mockContext: RuleContext = {
    profile: mockProfile,
    enabledScenarios: [],
    currentDate: new Date(),
    sessionId: 'test-session'
};

console.log('Testing Dynamic Explanations...');

// Test 1: ISA Rule (Salary Interpolation)
console.log('\n--- 1. Testing ISA Rule ---');
const isaResult = evaluateRules([ISA_MAXIMIZE], mockContext);
const isaRec = isaResult.recommendations.find(r => r.scenarioId === 'open_investment_isa' as any);

if (isaRec) {
    console.log('Reasoning:', isaRec.reasoning);
    if (isaRec.reasoning.includes('£60,000')) {
        console.log('✅ PASS: Found formatted salary £60,000');
    } else {
        console.log('❌ FAIL: Did not find £60,000. Got:', isaRec.reasoning);
        process.exit(1);
    }
} else {
    console.log('❌ FAIL: ISA Rule did not trigger');
    process.exit(1);
}

// Test 2: Pension Rule (Age Interpolation)
console.log('\n--- 2. Testing Pension Rule ---');
const pensionResult = evaluateRules([PENSION_YOUNG_PROFESSIONAL], mockContext);
const pensionRec = pensionResult.recommendations.find(r => r.scenarioId === 'increase_pension_contribution' as any);

if (pensionRec) {
    console.log('Reasoning:', pensionRec.reasoning);
    if (pensionRec.reasoning.includes('30 years old')) {
        console.log('✅ PASS: Found age 30');
    } else {
        console.log('❌ FAIL: Did not find 30 years old. Got:', pensionRec.reasoning);
        process.exit(1);
    }
} else {
    console.log('❌ FAIL: Pension Rule did not trigger');
    process.exit(1);
}

console.log('\n✅ ALL TESTS PASSED');
