// sim-core - Standalone Financial Simulation Engine
// Zero UI dependencies, pure Node.js package

// Core simulation components
export { BalanceAccount } from './engine/balanceAccount'
export { CashFlowAllocator } from './engine/cashFlowAllocator'
export { ScenarioSimulator, AssetClass } from './engine/scenarioSimulator'
export { aggregateToYearly } from './engine/yearlyAggregator'

// Configuration and definitions
export { ScenarioArchetype } from './config/archetypes'

// Thematic Scenario Registry (Wave 3: Legacy system removed)
export {
  ScenarioTheme,
  ScenarioId,
  THEME_METADATA,
  SCENARIO_REGISTRY,
  getScenariosByTheme,
  getScenarioById,
  getThemeMetadata,
  getAllThemes,
  searchScenariosByTag
} from './config/scenarioRegistry'
export {
  COMMON_FIELDS,
  getDefaultTargetDate,
  getDefaultDateAtAge,
  getDefaultsFromTemplate,
  validateScenarioData,
  isFieldVisible
} from './config/scenarioMetadata'

// UK-specific financial rules
export * from './engine/ukTaxCalculator'
export * from './config/ukPensionRules'

// AI Agent Orchestration (Rules Engine)
export * from './agents'

// Type exports
export type { SimulationScenario, ProjectionPoint, CategoryBreakdown, Goal, SolvencyAnalysis, SimulationResult } from './engine/scenarioSimulator'
export type { ScenarioModifier, TargetedModifier, ConfigModifier, StudentLoanModifier } from './config/archetypeContracts'
export type { AllocationConfig, AllocationResult, AccountRegistry, AccountWrapper } from './engine/cashFlowAllocator'
export type { FieldDefinition, ChoiceOption, FrequencyType, AmountWithFrequency } from './models/sharedTypes'
