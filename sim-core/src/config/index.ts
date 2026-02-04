/**
 * CONFIG MODULE EXPORTS
 * 
 * Central export point for all configuration-related modules
 */

// Archetypes and definitions
export { ScenarioArchetype, ARCHETYPE_DEFINITIONS, getArchetypeDefinition } from './archetypes'
export type { ArchetypeDefinition } from './archetypes'

// Discriminated union types (Wave 1.2)
export type { 
  ScenarioModifier, 
  TargetedModifier, 
  ConfigModifier, 
  StudentLoanModifier 
} from './archetypeContracts'
export { 
  isTargetedModifier, 
  isConfigModifier, 
  isStudentLoanModifier 
} from './archetypeContracts'

// Archetype parameter contracts (Wave 1.2)
export type {
  BaseArchetypeParams,
  OneOffInflowParams,
  OneOffExpenseParams,
  OneOffAccountContributionParams,
  OneOffAccountWithdrawalParams,
  RecurringIncomeParams,
  RecurringExpenseParams,
  RecurringAccountContributionParams,
  RecurringAccountWithdrawalParams,
  AllocationConfigChangeParams,
  InterestRateChangeParams,
  NewDebtParams,
  StudentLoanParams,
  ArchetypeParams
} from './archetypeContracts'
export { isArchetypeParams } from './archetypeContracts'

// Archetype builders (Wave 1.2)
export {
  buildOneOffInflow,
  buildOneOffExpense,
  buildOneOffAccountContribution,
  buildOneOffAccountWithdrawal,
  buildRecurringIncome,
  buildRecurringExpense,
  buildRecurringAccountContribution,
  buildRecurringAccountWithdrawal,
  buildAllocationConfigChange,
  buildInterestRateChange,
  buildNewDebt,
  buildStudentLoan,
  buildMultiModifiers,
  generateModifierId,
  generateModifierName
} from './archetypeBuilders'

// Scenario types (enums separated to avoid circular dependencies)
export { ScenarioTheme, ScenarioId } from './scenarioTypes'

// Scenario registry and metadata (Wave 3: Legacy compatibility removed)
export {
  SCENARIO_REGISTRY,
  THEME_METADATA,
  getScenarioById,
  getScenariosByTheme
} from './scenarioRegistry'
export type { ScenarioDescriptor } from './scenarioRegistry'
