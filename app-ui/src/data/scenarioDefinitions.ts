import { ScenarioId, SCENARIO_REGISTRY } from '../../../sim-core/src/config/index'
import type { ConfigField } from '../../../sim-core/src/config/configSchema'

export interface ScenarioDefinition {
  id: string
  displayName: string
  description: string
  fields: ConfigField<any>[]
  guidanceText?: string
  category: string
}

/**
 * Get scenario definition by ScenarioId (thematic approach)
 * 
 * Wave 3 Phase 3: Now uses registry metadata only
 * Fields will be populated from simplifiedTemplates.ts in future enhancement
 */
export function getScenarioDefinition(scenarioId: ScenarioId): ScenarioDefinition | null {
  const registryEntry = SCENARIO_REGISTRY[scenarioId]
  if (!registryEntry) {
    console.warn(`[scenarioDefinitions] No registry entry for ${scenarioId}`)
    return null
  }
  
  // Wave 3 Phase 3: Using registry metadata only
  return {
    id: scenarioId,
    displayName: registryEntry.displayName,
    description: registryEntry.description,
    fields: [],  // TODO: Populate from simplifiedTemplates.ts
    guidanceText: registryEntry.guidanceText,
    category: registryEntry.theme
  }
}
