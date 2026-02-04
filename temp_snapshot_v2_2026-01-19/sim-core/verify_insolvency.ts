
import { ScenarioSimulator, BalanceAccount, ScenarioArchetype } from './src/index';

console.log('🧪 Starting Insolvency Verification Test...');

// 1. Create a "Broke" Baseline
const baseline = {
    accounts: [
        new BalanceAccount({
            name: 'Current Account',
            startingBalance: 0,
            contribution: 0,
            frequency: 'monthly',
            performance: 0,
            isDebt: false
        })
    ],
    monthlyIncome: 2000,
    monthlyExpenses: 2000, // Zero surplus
    currentAge: 30,
    retirementAge: 65,
    statePensionMonthly: 0
};

// 2. Create a massive expense modifier
const massiveExpense = {
    id: 'expense-1',
    name: 'Unaffordable Purchase',
    archetype: ScenarioArchetype.ONE_OFF_EXPENSE,
    targetAmount: 50000, // £50k expense
    startDate: new Date(),
    targetDate: new Date(new Date().getFullYear() + 1, 0, 1), // 1 year from now
    params: {}
};

// 3. Initialize Simulator
const simulator = new ScenarioSimulator({
    baseline,
    modifiers: [massiveExpense]
}, 5 * 12); // 5 years

// 4. Run Projection
const result = simulator.generateScenarioProjection();

// 5. Assertions
console.log('\n--- Results ---');
console.log(`Solvent: ${result.solvency.isSolvent}`);
console.log(`Max Deficit: £${result.solvency.maxDeficit.toLocaleString()}`);
console.log(`First Deficit Date: ${result.solvency.firstDeficitDate}`);

const fs = require('fs');

if (result.solvency.isSolvent === false && result.solvency.maxDeficit >= 50000) {
    const msg = '\n✅ PASS: Simulator correctly flagged insolvency.';
    console.log(msg);
    fs.writeFileSync('verify_result.txt', msg);
    process.exit(0);
} else {
    const msg = `\n❌ FAIL: Simulator failed to identify insolvency.\nExpected isSolvent=false, Got ${result.solvency.isSolvent}\nMax Deficit: ${result.solvency.maxDeficit}`;
    console.error(msg);
    fs.writeFileSync('verify_result.txt', msg);
    process.exit(1);
}
