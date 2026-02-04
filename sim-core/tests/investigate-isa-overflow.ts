import { ScenarioSimulator } from '../src/engine/scenarioSimulator'
import { BalanceAccount } from '../src/engine/balanceAccount'
import { AssetClass } from '../src/engine/scenarioSimulator'

// Alpha 2 profile configuration
const currentAge = 34
const retirementAge = 70
const grossSalary = 108000
const monthlyExpenses = 1725

// Create baseline accounts
const baselineAccounts = [
  // Private ISA: £110,000 at 7%
  new BalanceAccount({
    name: 'Private ISA',
    startingBalance: 110000,
    contribution: 0,
    performance: 7,
    frequency: 'monthly',
    isDebt: false
  }),
  // Workplace Pension: £53,000 at 5%
  new BalanceAccount({
    name: 'Workplace Pension (L&G)',
    startingBalance: 53000,
    contribution: 720, // £8,640/year employer match
    performance: 5,
    frequency: 'monthly',
    isDebt: false
  }),
  // Mortgage: £346,000 at 4.5%
  new BalanceAccount({
    name: 'Mortgage',
    startingBalance: 346000,
    contribution: 2220, // £26,640/year
    performance: 4.5,
    frequency: 'monthly',
    isDebt: true
  }),
  // Current Account
  new BalanceAccount({
    name: 'Current Account',
    startingBalance: 15000,
    contribution: 0,
    performance: 0,
    frequency: 'monthly',
    isDebt: false
  })
]

// Calculate tax/NI (simplified - using approximate rates)
function calculateNetSalary(gross: number): number {
  // Rough UK tax/NI calculation
  const personalAllowance = 12570
  const basicRateLimit = 50270
  
  let tax = 0
  if (gross > personalAllowance) {
    const taxableBasic = Math.min(gross - personalAllowance, basicRateLimit - personalAllowance)
    tax += taxableBasic * 0.20
    
    if (gross > basicRateLimit) {
      const taxableHigher = gross - basicRateLimit
      tax += taxableHigher * 0.40
    }
  }
  
  // NI: 8% on £12,570-£50,270, 2% above
  let ni = 0
  if (gross > 12570) {
    const niBasic = Math.min(gross - 12570, 50270 - 12570)
    ni += niBasic * 0.08
    
    if (gross > 50270) {
      const niHigher = gross - 50270
      ni += niHigher * 0.02
    }
  }
  
  return gross - tax - ni
}

const netSalary = calculateNetSalary(grossSalary)
const monthlyNet = netSalary / 12
const annualExpenses = monthlyExpenses * 12
const annualMortgage = 2220 * 12
const annualPensionContribution = 720 * 12

console.log('\n=== ALPHA 2 PROFILE ANALYSIS ===\n')
console.log('Gross Salary:', grossSalary.toLocaleString())
console.log('Net Salary (after tax/NI):', netSalary.toLocaleString())
console.log('Monthly Net:', monthlyNet.toLocaleString())
console.log('\nAnnual Commitments:')
console.log('  Expenses:', annualExpenses.toLocaleString())
console.log('  Mortgage:', annualMortgage.toLocaleString())
console.log('  Pension (scheduled):', annualPensionContribution.toLocaleString())
console.log('  Total:', (annualExpenses + annualMortgage + annualPensionContribution).toLocaleString())

const annualSurplus = netSalary - annualExpenses - annualMortgage - annualPensionContribution
console.log('\nAnnual Surplus:', annualSurplus.toLocaleString())
console.log('\nWith 75% to ISA:', (annualSurplus * 0.75).toLocaleString())
console.log('With 5% to Pension:', (annualSurplus * 0.05).toLocaleString())

// Run simulation
const simulator = new ScenarioSimulator({
  baseline: {
    accounts: baselineAccounts,
    monthlyIncome: grossSalary / 12,
    monthlyExpenses: monthlyExpenses,
    currentAge,
    retirementAge,
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

// Analyze 2025 (year 0)
console.log('\n\n=== YEAR 2025 (Year 0) ===')
const year2025 = projection.slice(0, 12)
const totalCashFlow2025 = year2025.reduce((sum, p) => sum + p.cashFlow, 0)
const totalScenarioIncome2025 = year2025.reduce((sum, p) => sum + (p.breakdown.scenarioIncome || 0), 0)

console.log('Total Monthly Cash Flow:', totalCashFlow2025.toLocaleString())
console.log('Total Scenario Income:', totalScenarioIncome2025.toLocaleString())

// Find ISA contributions
const isaAccount = year2025[11].breakdown.assetCategories.find(a => a.name.includes('ISA'))
if (isaAccount) {
  console.log('\nISA Account at end of 2025:')
  console.log('  Balance:', isaAccount.value.toLocaleString())
  console.log('  Expected annual contribution (75% of surplus):', (annualSurplus * 0.75).toLocaleString())
}

// Analyze 2044 (year 19)
console.log('\n\n=== YEAR 2044 (Year 19) ===')
const year2044Start = 19 * 12
const year2044 = projection.slice(year2044Start, year2044Start + 12)
const totalCashFlow2044 = year2044.reduce((sum, p) => sum + p.cashFlow, 0)
const totalScenarioIncome2044 = year2044.reduce((sum, p) => sum + (p.breakdown.scenarioIncome || 0), 0)

console.log('Total Monthly Cash Flow:', totalCashFlow2044.toLocaleString())
console.log('Total Scenario Income:', totalScenarioIncome2044.toLocaleString())

const isaAccount2044 = year2044[11].breakdown.assetCategories.find(a => a.name.includes('ISA'))
if (isaAccount2044) {
  console.log('\nISA Account at end of 2044:')
  console.log('  Balance:', isaAccount2044.value.toLocaleString())
}

console.log('\n')
