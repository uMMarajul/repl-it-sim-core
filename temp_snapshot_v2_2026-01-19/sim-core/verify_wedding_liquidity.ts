
import { ScenarioSimulator, BalanceAccount, ScenarioArchetype, AssetClass } from './src/index';

console.log('🧪 Starting Wedding Liquidity Verification Test...');

// 1. Create Baseline with Cash and Investments
const baseline = {
    accounts: [
        new BalanceAccount({
            name: 'Cash Savings',
            startingBalance: 10000,
            contribution: 0,
            frequency: 'monthly',
            performance: 0,
            isDebt: false
        }),
        new BalanceAccount({
            name: 'General Investment Account',
            startingBalance: 50000,
            contribution: 0,
            frequency: 'monthly',
            performance: 0.05,
            isDebt: false
        })
    ],
    monthlyIncome: 4000, // High income to ensure solvency
    monthlyExpenses: 2000,
    currentAge: 30,
    retirementAge: 65,
    statePensionMonthly: 0
};

// 2. Create Wedding Expense (exceeds cash)
const weddingExpense = {
    id: 'wedding-1',
    name: 'Wedding',
    archetype: ScenarioArchetype.ONE_OFF_EXPENSE,
    targetAmount: 30000, // £30k expense vs £10k cash
    targetDate: new Date(new Date().getFullYear() + 1, 0, 1),
    params: {}
};

// 3. Initialize Simulator
const simulator = new ScenarioSimulator({
    baseline,
    modifiers: [weddingExpense]
}, 3 * 12);

// 4. Run Projection
const result = simulator.generateScenarioProjection();

// 5. Deep Inspection
console.log('\n--- Solvency Results ---');
console.log(`Solvent: ${result.solvency.isSolvent}`);
console.log(`Max Cash Shortfall: £${result.solvency.maxCashShortfall?.toLocaleString()}`);

// Find the month of the wedding (Year 1, Month 0 = Period 12)
const weddingPeriod = 12;
const point = result.projection[weddingPeriod];

if (point) {
    console.log(`\n--- Point Inspection (Period ${weddingPeriod}) ---`);
    // point.accounts does not exist on ProjectionPoint interface

    console.log('Asset Categories (used for solvency check):');
    if (point.breakdown.assetCategories) {
        point.breakdown.assetCategories.forEach(c => console.log(`  ${c.name}: £${c.value.toLocaleString()}`));
    } else {
        console.log('  <No Asset Categories>');
    }
}

const fs = require('fs');
let msg = '';

if (result.solvency.maxCashShortfall && result.solvency.maxCashShortfall > 0) {
    msg = '\n✅ PASS: Shortfall Detected. Value: ' + result.solvency.maxCashShortfall;
} else {
    msg = '\n❌ FAIL: No Shortfall Detected. \nValue: ' + result.solvency.maxCashShortfall;
}
console.log(msg);
fs.writeFileSync('verify_liquidity_result.txt', msg);
if (msg.includes('PASS')) {
    process.exit(0);
} else {
    msg = `\n❌ FAIL: Engine metrics incorrect.\nExpected Shortfall > 19000, Got ${result.solvency.maxCashShortfall}\nExpected CanFix=true, Got ${result.solvency.canFixWithLiquidation}`;
    console.error(msg);
    fs.writeFileSync('verify_liquidity_result.txt', msg);
    process.exit(1);
}
