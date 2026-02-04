#!/usr/bin/env node

import { ScenarioSimulator, BalanceAccount } from './index'

// Example CLI simulation runner
function runExample() {
  console.log('🚀 Financial Simulation Engine - CLI Demo\n')

  // Create baseline scenario
  const baseline = {
    accounts: [
      new BalanceAccount({
        name: 'Pension',
        startingBalance: 50000,
        contribution: 500,
        frequency: 'monthly',
        performance: 6.0,
        isDebt: false
      }),
      new BalanceAccount({
        name: 'ISA',
        startingBalance: 10000,
        contribution: 200,
        frequency: 'monthly',
        performance: 7.0,
        isDebt: false
      })
    ],
    monthlyIncome: 3500,
    monthlyExpenses: 2500,
    currentAge: 30,
    retirementAge: 65,
    statePensionMonthly: 900
  }

  const simulator = new ScenarioSimulator({ baseline, modifiers: [] }, 40)

  console.log('⚙️  Running 40-year baseline projection...\n')
  const result = simulator.generateBaselineProjection()
  const projection = result.projection

  // Show results at key milestones
  const milestones = [0, 10, 20, 30, 39]

  console.log('📊 Projection Results:\n')
  console.log('Year | Age | Net Worth  | Cash Flow  | Assets     | Pension    ')
  console.log('-----|-----|------------|------------|------------|------------')

  milestones.forEach(yearIndex => {
    const monthIndex = yearIndex * 12
    if (monthIndex < projection.length) {
      const point = projection[monthIndex]
      const age = 30 + yearIndex
      const netWorth = `£${Math.round(point.netWorth).toLocaleString()}`
      const cashFlow = `£${Math.round(point.cashFlow).toLocaleString()}`
      const assets = `£${Math.round(point.breakdown.assetValue).toLocaleString()}`

      // Find pension value
      const pension = point.breakdown.assetCategories.find(a => a.name === 'Pension')
      const pensionValue = `£${Math.round(pension?.value || 0).toLocaleString()}`

      console.log(
        `${yearIndex.toString().padEnd(4)} | ${age.toString().padEnd(3)} | ${netWorth.padEnd(10)} | ${cashFlow.padEnd(10)} | ${assets.padEnd(10)} | ${pensionValue}`
      )
    }
  })

  // Final summary
  const finalPoint = projection[projection.length - 1]
  console.log('\n✅ Simulation Complete!')
  console.log(`\n📈 Final Net Worth (Age ${30 + 39}): £${Math.round(finalPoint.netWorth).toLocaleString()}`)
  console.log(`💰 Final Assets: £${Math.round(finalPoint.breakdown.assetValue).toLocaleString()}`)
  console.log(`🎯 Net Cash Flow: £${Math.round(finalPoint.cashFlow).toLocaleString()}`)
}

// Run the example
try {
  runExample()
} catch (error) {
  console.error('❌ Error running simulation:', error)
  process.exit(1)
}
