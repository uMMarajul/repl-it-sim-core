/**
 * Bespoke Scenario Default Config Generator
 * 
 * Wave 2 dual-path architecture: Generates legacy-schema-compliant configs
 * for new scenarios without legacy transformers, using archetype defaults.
 * 
 * Conforms to GoalConfig/ActionConfig/EventConfig interfaces for store compatibility.
 * 
 * TODO Wave 3: Consolidate with legacy transformers into unified system
 */

import { ScenarioArchetype } from '../../../sim-core/src/config/archetypes'
import type { ScenarioDescriptor } from '../../../sim-core/src/config/scenarioRegistry'

/**
 * Generate legacy-schema-compliant default config for bespoke scenarios
 * Returns a config matching GoalConfig/ActionConfig/EventConfig interfaces
 */
export function generateBespokeDefaults(scenario: ScenarioDescriptor): any {
  const primaryArchetype = scenario.archetypes[0]
  
  // Common date defaults (serialized to ISO strings for legacy schema compatibility)
  const currentDate = new Date()
  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  const oneYearLater = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1)
  const tenYearsLater = new Date(currentDate.getFullYear() + 10, currentDate.getMonth(), 1)
  
  // Base config matching legacy schemas (dates as ISO strings)
  const baseConfig = {
    enabled: true,
    targetAmount: 0,
    startDate: nextMonth.toISOString(),
    duration: 0,
    performance: 0
  }
  
  switch (primaryArchetype) {
    case ScenarioArchetype.ALLOCATION_CONFIG_CHANGE:
      // START_INVESTING_GIA: Allocation change (ActionConfig shape)
      return {
        ...baseConfig,
        targetAmount: 1000,  // Monthly allocation target
        duration: 0,  // Ongoing
        allocationChanges: {
          generalInvestment: 10, // 10% to GIA
          defaultSavings: -10    // Reduce default savings by 10%
        }
      }
      
    case ScenarioArchetype.RECURRING_INCOME:
      // DISABILITY_SUPPORT: Monthly income (GoalConfig shape)
      return {
        enabled: true,
        targetAmount: 300,  // £300/month (PIP mid-range)
        targetDate: oneYearLater.toISOString(),
        startDate: nextMonth.toISOString(),
        duration: 0,  // Ongoing
        frequency: 'monthly' as const,
        performance: 0,
        startingAmount: 0,
        assumptions: {}
      }
      
    case ScenarioArchetype.RECURRING_EXPENSE:
      // COST_OF_LIVING_SHOCK: Monthly expense (EventConfig shape)
      return {
        ...baseConfig,
        targetAmount: 150,  // £150/month
        duration: 12  // 12 months
      }
      
    case ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL:
      // RETIREMENT_DRAWDOWN_TEST: Recurring withdrawal (ActionConfig shape)
      return {
        ...baseConfig,
        targetAmount: 2000,  // £2000/month (4% rule)
        startDate: tenYearsLater.toISOString(),
        duration: 0,  // Ongoing
        accountType: 'pension'
      }
      
    default:
      // Fallback: minimal ActionConfig
      return {
        ...baseConfig,
        targetAmount: 1000
      }
  }
}

/**
 * Check if a scenario uses bespoke handling
 */
export function isBespokeScenario(scenario: ScenarioDescriptor | undefined): boolean {
  return scenario?.scenarioMode === 'bespoke'
}
