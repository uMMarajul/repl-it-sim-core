import { ScenarioSimulator, AssetClass } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'

// Alpha 2 baseline accounts
const baselineAccounts = [
  new BalanceAccount({
    name: 'Private ISA',
    startingBalance: 110000,
    contribution: 0,
    performance: 7,
    frequency: 'monthly',
    isDebt: false
  }),
  new BalanceAccount({
    name: 'Workplace Pension (L&G)',
    startingBalance: 53000,
    contribution: 720,
    performance: 5,
    frequency: 'monthly',
    isDebt: false
  }),
  new BalanceAccount({
    name: 'Mortgage',
    startingBalance: 346000,
    contribution: 2220,
    performance: 4.5,
    frequency: 'monthly',
    isDebt: true
  }),
  new BalanceAccount({
    name: 'Current Account',
    startingBalance: 15000,
    contribution: 0,
    performance: 0,
    frequency: 'monthly',
    isDebt: false
  })
]

const simulator = new ScenarioSimulator({
  baseline: {
    accounts: baselineAccounts,
    monthlyIncome: 108000 / 12,
    monthlyExpenses: 1725,
    currentAge: 34,
    retirementAge: 70,
    statePensionMonthly: 11500 / 12,
    allocationConfig: {
      automatedAllocationPercentages: {
        [AssetClass.EQUITIES]: 75,
        [AssetClass.PENSION]: 5
      }
    }
  },
  modifiers: []
})

const projection = simulator.generateScenarioProjection()

console.log('\n=== DETAILED ISA CONTRIBUTION TRACKING ===\n')
console.log('Month | Cash Flow | ISA Balance | Monthly Change | Notes')
console.log('------|-----------|-------------|----------------|-------')

let lastISABalance = 110000
let totalContributions2025 = 0
let contributionMonths2025: number[] = []

// Track first 24 months (2 years)
for (let month = 0; month < 24; month++) {
  const point = projection[month]
  const isaCategory = point.breakdown.assetCategories.find(a => a.name.includes('ISA'))
  const currentISABalance = isaCategory?.value || 0
  const monthlyChange = currentISABalance - lastISABalance
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month % 12]
  const year = 2025 + Math.floor(month / 12)
  const isApril = (month % 12) === 3
  
  // Track 2025 contributions
  if (month < 12) {
    totalContributions2025 += monthlyChange
    contributionMonths2025.push(monthlyChange)
  }
  
  const notes = isApril ? 'TAX YEAR RESET' : ''
  console.log(`${monthName} ${year} | £${point.cashFlow.toFixed(0).padStart(6)} | £${currentISABalance.toFixed(0).padStart(10)} | £${monthlyChange.toFixed(2).padStart(8)} | ${notes}`)
  
  lastISABalance = currentISABalance
}

console.log('\n=== SUMMARY ===')
console.log(`Total ISA contributions in 2025: £${totalContributions2025.toFixed(2)}`)
console.log(`Average monthly change: £${(totalContributions2025 / 12).toFixed(2)}`)
console.log(`Expected from 75% allocation: £${(17217 / 12).toFixed(2)}/month`)
console.log(`\nMonthly breakdown:`, contributionMonths2025.map((c, i) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}: £${c.toFixed(2)}`).join(', '))
