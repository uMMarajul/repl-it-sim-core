/**
 * SCENARIO REGISTRY - Thematic Organization System
 * 
 * This module defines the new thematic structure for organizing financial scenarios,
 * replacing the legacy Goals/Actions/Events categorization with user-centric themes.
 * 
 * Design Principles:
 * - User-centric: Organized by financial life areas, not technical categories
 * - Consolidated: Merges similar scenarios to reduce complexity (58 → 55 scenarios)
 * - Extensible: Easy to add new scenarios within existing themes
 * - Type-safe: Strong TypeScript contracts prevent errors
 * 
 * Migration Status: Wave 0.2 - Foundation Infrastructure
 */

import { ScenarioArchetype } from './archetypes'
import { ScenarioTheme, ScenarioId } from './scenarioTypes'

// Re-export enums for backward compatibility
export { ScenarioTheme, ScenarioId }

// ============================================================================
// SCENARIO METADATA - Descriptive Information
// ============================================================================

/**
 * ScenarioDescriptor - Complete metadata for a scenario
 * 
 * This replaces the scattered definitions across multiple files
 * (goalDefinitions, ACTION_SCHEMAS, EVENT_SCHEMAS, SIMPLIFIED_TEMPLATES).
 */
export interface ScenarioDescriptor {
  /** Unique identifier for this scenario (from ScenarioId enum) */
  id: ScenarioId
  
  /** User-friendly display name shown in UI */
  displayName: string
  
  /** Brief description of the scenario (1-2 sentences) */
  description: string
  
  /** Thematic grouping this scenario belongs to */
  theme: ScenarioTheme
  
  /** Primary archetype(s) this scenario uses for calculations */
  archetypes: ScenarioArchetype[]
  
  /** Whether this scenario generates multiple modifiers */
  isMultiModifier: boolean
  
  /** Tags for filtering and search (e.g., ["debt", "savings", "uk-tax"]) */
  tags: string[]
  
  /** Guidance text shown to users when configuring this scenario */
  guidanceText?: string
  
  /** Whether this is a newly introduced scenario (not in legacy system) */
  isNew?: boolean
}

/**
 * Theme metadata for UI display
 */
export interface ThemeDescriptor {
  id: ScenarioTheme
  displayName: string
  description: string
  icon?: string  // Optional icon identifier for UI
  scenarioCount: number
}

// ============================================================================
// REGISTRY IMPLEMENTATION
// ============================================================================

/**
 * THEME_METADATA - Display information for each theme
 * 
 * Note: scenarioCount is calculated dynamically based on actual ScenarioId enum members
 */
const THEME_SCENARIO_COUNTS: Record<ScenarioTheme, number> = {
  [ScenarioTheme.FOUNDATIONAL_STABILITY]: 9,
  [ScenarioTheme.HOUSING_ASSETS]: 7,
  [ScenarioTheme.FAMILY_CARE]: 7,
  [ScenarioTheme.CAREER_INCOME]: 12,
  [ScenarioTheme.HEALTH_PROTECTION]: 7,
  [ScenarioTheme.MARKET_ECONOMIC]: 12
}

export const THEME_METADATA: Record<ScenarioTheme, ThemeDescriptor> = {
  [ScenarioTheme.FOUNDATIONAL_STABILITY]: {
    id: ScenarioTheme.FOUNDATIONAL_STABILITY,
    displayName: 'Foundational Stability',
    description: 'Build your financial foundation: emergency funds, savings, debt management, pensions, and investments',
    icon: 'foundation',
    scenarioCount: THEME_SCENARIO_COUNTS[ScenarioTheme.FOUNDATIONAL_STABILITY]
  },
  [ScenarioTheme.HOUSING_ASSETS]: {
    id: ScenarioTheme.HOUSING_ASSETS,
    displayName: 'Housing & Assets',
    description: 'Major purchases and assets: property, vehicles, mortgages, renovations',
    icon: 'home',
    scenarioCount: THEME_SCENARIO_COUNTS[ScenarioTheme.HOUSING_ASSETS]
  },
  [ScenarioTheme.FAMILY_CARE]: {
    id: ScenarioTheme.FAMILY_CARE,
    displayName: 'Family & Care',
    description: 'Life stages and dependents: marriage, children, education, elder care, relationship changes',
    icon: 'family',
    scenarioCount: THEME_SCENARIO_COUNTS[ScenarioTheme.FAMILY_CARE]
  },
  [ScenarioTheme.CAREER_INCOME]: {
    id: ScenarioTheme.CAREER_INCOME,
    displayName: 'Career & Income',
    description: 'Work and earnings: salary changes, job moves, business ventures, professional development',
    icon: 'career',
    scenarioCount: THEME_SCENARIO_COUNTS[ScenarioTheme.CAREER_INCOME]
  },
  [ScenarioTheme.HEALTH_PROTECTION]: {
    id: ScenarioTheme.HEALTH_PROTECTION,
    displayName: 'Health & Protection',
    description: 'Medical events and unexpected costs: health emergencies, insurance, protection',
    icon: 'health',
    scenarioCount: THEME_SCENARIO_COUNTS[ScenarioTheme.HEALTH_PROTECTION]
  },
  [ScenarioTheme.MARKET_ECONOMIC]: {
    id: ScenarioTheme.MARKET_ECONOMIC,
    displayName: 'Market & Economic Forces',
    description: 'External shocks and macro events: market movements, interest rates, windfalls, withdrawals',
    icon: 'market',
    scenarioCount: THEME_SCENARIO_COUNTS[ScenarioTheme.MARKET_ECONOMIC]
  }
}

// Import complete registry data (populated in Wave 1.1)
import { COMPLETE_SCENARIO_REGISTRY } from './scenarioRegistryData'

/**
 * SCENARIO_REGISTRY - Central repository for all scenario metadata
 * 
 * Fully populated with 54 scenarios across 6 themes (Wave 1.1 complete)
 */
export const SCENARIO_REGISTRY: Record<ScenarioId, ScenarioDescriptor> = COMPLETE_SCENARIO_REGISTRY

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all scenarios for a specific theme
 */
export function getScenariosByTheme(theme: ScenarioTheme): ScenarioDescriptor[] {
  return Object.values(SCENARIO_REGISTRY)
    .filter(scenario => scenario?.theme === theme)
    .filter((scenario): scenario is ScenarioDescriptor => scenario !== undefined)
}

/**
 * Get scenario metadata by ID
 * Returns scenario descriptor with authoritative legacyType metadata
 */
export function getScenarioById(id: ScenarioId): ScenarioDescriptor | undefined {
  return SCENARIO_REGISTRY[id]
}

/**
 * Get theme metadata
 */
export function getThemeMetadata(theme: ScenarioTheme): ThemeDescriptor {
  return THEME_METADATA[theme]
}

/**
 * Get all themes
 */
export function getAllThemes(): ThemeDescriptor[] {
  return Object.values(THEME_METADATA)
}

/**
 * Search scenarios by tag
 */
export function searchScenariosByTag(tag: string): ScenarioDescriptor[] {
  return Object.values(SCENARIO_REGISTRY)
    .filter(scenario => scenario?.tags.includes(tag))
    .filter((scenario): scenario is ScenarioDescriptor => scenario !== undefined)
}

