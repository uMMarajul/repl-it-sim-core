import { ScenarioArchetype } from './archetypes'

/**
 * Helper function to generate default dates based on archetype
 * Extracted to standalone module to avoid circular dependencies
 */
export function getDefaultTargetDate(archetype: ScenarioArchetype, monthsAhead?: number): string {
  const now = new Date()
  let defaultMonths = monthsAhead

  if (!defaultMonths) {
    switch (archetype) {
      case ScenarioArchetype.ONE_OFF_INFLOW:
        defaultMonths = 6 // 6 months for expected cash inflows
        break
      case ScenarioArchetype.ONE_OFF_EXPENSE:
        defaultMonths = 12 // 1 year for one-time expenses
        break
      case ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION:
        defaultMonths = 1 // 1 month for one-time contributions
        break
      case ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION:
        defaultMonths = 24 // 2 years for regular savings goals
        break
      case ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL:
        defaultMonths = 12 // 1 year for planned one-time withdrawals
        break
      case ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL:
        defaultMonths = 60 // 5 years for pension drawdown planning
        break
      case ScenarioArchetype.INTEREST_RATE_CHANGE:
        defaultMonths = 3 // 3 months for rate changes
        break
      case ScenarioArchetype.RECURRING_EXPENSE:
        defaultMonths = 12 // 1 year for recurring expenses
        break
      case ScenarioArchetype.RECURRING_INCOME:
        defaultMonths = 12 // 1 year for recurring income
        break
      default:
        defaultMonths = 24 // Default 2 years
    }
  }

  now.setMonth(now.getMonth() + defaultMonths)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}
