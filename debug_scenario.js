
const { ScenarioSimulator, BalanceAccount } = require('./sim-core/dist/index');

const scenario = {
    baseline: {
        accounts: [
            new BalanceAccount({ name: 'Cash Setup', startingBalance: 10000, contribution: 0, frequency: 'monthly', performance: 0 })
        ],
        currentAge: 30,
        retirementAge: 65,
        monthlyIncome: 2000,
        monthlyExpenses: 1500
    },
    modifiers: [
        {
            id: 'wedding',
            name: 'Wedding',
            archetype: 'one_off_expense',
            targetAmount: 150000,
            targetDate: new Date(2026, 0, 1),
            paymentSource: 'savings'
        }
    ]
};

const sim = new ScenarioSimulator(scenario, 10, 2025, 0); // 10 years
const result = sim.generateScenarioProjection();

let hasNegative = false;
result.projection.forEach(p => {
    if (p.netWorth < 0) {
        hasNegative = true;
        console.log(`Period ${p.period}: Net Worth = ${p.netWorth}`);
    }
});

if (hasNegative) {
    console.log("✅ Simulation produced NEGATIVE net worth.");
} else {
    console.log("❌ Simulation floored at 0.");
}
