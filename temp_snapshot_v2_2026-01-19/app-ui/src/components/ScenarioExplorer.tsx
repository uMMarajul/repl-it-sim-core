import { useState, useMemo, useEffect } from 'react'
import { useScenarioStore } from '../state/scenarioStore'
import { ScenarioTheme, ScenarioId, SCENARIO_REGISTRY, THEME_METADATA, getScenariosByTheme, getScenarioById } from '../../../sim-core/src/config/index'
import { ConfigDialog } from './ConfigDialog'
import { getScenarioDefinition } from '../data/scenarioDefinitions'
import { getTemplate, getDefaultsFromTemplate } from '../config/simplifiedTemplates'
import { transformSimplifiedConfig } from '../config/configTransformers'
import { generateBespokeDefaults, isBespokeScenario } from '../config/bespokeScenarioDefaults'
import '../styles/ScenarioExplorer.css'

interface ScenarioItemProps {
  scenarioId: ScenarioId
  displayName: string
  theme: ScenarioTheme
  onTriggerConfig?: () => void
}

function ScenarioItem({ scenarioId, displayName, theme, onTriggerConfig }: ScenarioItemProps) {
  const { state, dispatch } = useScenarioStore()
  const [showDialog, setShowDialog] = useState(false)
  const isEnabled = state.scenarios[scenarioId]?.enabled || false

  // Allow parent to trigger config dialog from ChatAssistant
  useEffect(() => {
    if (onTriggerConfig) {
      console.log('[ScenarioItem] Triggering config dialog for:', scenarioId)
      setShowDialog(true)
    }
  }, [onTriggerConfig, scenarioId])

  // Determine legacy type from registry metadata (Wave 2 backward compatibility)
  const scenarioMetadata = getScenarioById(scenarioId)
  const legacyType: 'goal' | 'action' | 'event' = (scenarioMetadata as any)?.legacyType || 'goal'

  const handleToggle = () => {
    console.log('[ScenarioItem] handleToggle called:', {
      scenarioId,
      displayName,
      theme,
      isEnabled,
      isBespoke: isBespokeScenario(scenarioMetadata),
      exists: !!state.scenarios[scenarioId]
    })

    if (!state.scenarios[scenarioId]) {
      // Bespoke scenarios (Wave 1 additions) use archetype-based defaults
      if (isBespokeScenario(scenarioMetadata)) {
        const bespokeDefaults = generateBespokeDefaults(scenarioMetadata!)
        console.log(`[ScenarioItem] Bespoke scenario ${scenarioId} - using archetype defaults:`, bespokeDefaults)

        dispatch({
          type: 'ADD_SCENARIO',
          scenario: {
            id: scenarioId,
            type: legacyType,
            enabled: true,
            data: bespokeDefaults,  // Archetype-based defaults (schema-complete)
            _simplifiedInputs: bespokeDefaults,  // Store for form repopulation
            scenarioMode: 'bespoke'  // Mark as bespoke to bypass legacy transformers
          }
        })
        setShowDialog(true)  // Open dialog for user to adjust defaults
        return
      }

      // Check if simplified template exists (not whether it has defaults)
      const simplifiedTemplate = getTemplate(scenarioId)

      // Safety check: If no simplified template exists at all, open config dialog
      if (!simplifiedTemplate) {
        console.warn(`[ScenarioItem] No simplified template for ${scenarioId} - opening config dialog for manual configuration`)
        setShowDialog(true)
        return
      }

      // Get default values from simplified template (may be empty if template relies on transformer)
      const simplifiedDefaults = getDefaultsFromTemplate(scenarioId) || {}

      // Transform simplified defaults into full config format (ActionConfig/EventConfig/GoalConfig)
      // Transformer may derive defaults from profile even if simplifiedDefaults is empty
      const transformedData = transformSimplifiedConfig(legacyType, scenarioId, simplifiedDefaults, state.selectedProfile)

      // Safety check: Ensure transformation produced valid data
      if (!transformedData || Object.keys(transformedData).length === 0) {
        console.error(`[ScenarioItem] Transformation failed for ${scenarioId} - opening config dialog`)
        setShowDialog(true)
        return
      }

      console.log('[ScenarioItem] Adding new scenario with defaults:', {
        scenarioId,
        legacyType,
        simplifiedDefaults,
        transformedData
      })

      dispatch({
        type: 'ADD_SCENARIO',
        scenario: {
          id: scenarioId,
          type: legacyType,
          enabled: true,
          data: transformedData,              // Schema-compliant config for sim-core
          _simplifiedInputs: simplifiedDefaults  // Original defaults for form repopulation
        }
      })
    } else {
      console.log('[ScenarioItem] Toggling existing scenario:', { scenarioId, currentEnabled: state.scenarios[scenarioId].enabled })
      dispatch({ type: 'TOGGLE_SCENARIO', scenarioId: scenarioId })
    }
  }

  // Get scenario definition - use simplified template if available, otherwise full definition
  let definition = null
  let isSimplified = false

  // Check for simplified template first (works for all scenario types)
  const simplifiedTemplate = getTemplate(scenarioId)

  if (simplifiedTemplate) {
    // Use simplified template
    const fullDefinition = getScenarioDefinition(scenarioId)

    definition = {
      displayName: fullDefinition?.displayName || displayName,
      fields: simplifiedTemplate.fields,
      description: fullDefinition?.description,
      guidanceText: simplifiedTemplate.guidanceText || fullDefinition?.guidanceText
    }
    isSimplified = true
  } else {
    // Fallback to full definition
    definition = getScenarioDefinition(scenarioId)
  }

  return (
    <div className="scenario-item">
      <div className="scenario-checkbox">
        <input
          type="checkbox"
          id={`checkbox-${scenarioId}`}
          checked={isEnabled}
          onChange={(e) => {
            console.log('[CHECKBOX] onChange fired!', { scenarioId, displayName, checked: e.target.checked })
            handleToggle()
          }}
          onClick={() => {
            console.log('[CHECKBOX] onClick fired!', { scenarioId, displayName })
          }}
        />
        <label htmlFor={`checkbox-${scenarioId}`} className="scenario-name">{displayName}</label>
      </div>
      <button
        className="configure-btn"
        onClick={() => setShowDialog(true)}
        disabled={!isEnabled || !definition}
      >
        Configure
      </button>

      {showDialog && definition && (
        <ConfigDialog
          scenarioId={scenarioId}
          scenarioName={definition.displayName}
          fields={definition.fields}
          description={definition.description}
          guidanceText={definition.guidanceText}
          onClose={() => setShowDialog(false)}
          isSimplified={isSimplified}
          scenarioType={legacyType}
        />
      )}
    </div>
  )
}

export function ScenarioExplorer() {
  const { state, dispatch } = useScenarioStore()
  const [directOpenConfig, setDirectOpenConfig] = useState<{ scenarioId: ScenarioId, params?: any } | null>(null)

  // Listen for events from ChatAssistant and directly open config
  // DISABLED: Config dialogs now open inline within ChatAssistant
  /*
  useEffect(() => {
    console.log('[ScenarioExplorer] 👂 Event listener registered for openScenarioConfig')
    
    const handleOpenScenarioConfig = (event: CustomEvent) => {
      const { scenarioId, params } = event.detail
      console.log('[ScenarioExplorer] 🎯 RECEIVED openScenarioConfig event!')
      console.log('[ScenarioExplorer] Event details:', { scenarioId, params })
      
      // Directly show the config dialog
      setDirectOpenConfig({ scenarioId, params })
      console.log('[ScenarioExplorer] ✅ Set directOpenConfig state')
    }

    window.addEventListener('openScenarioConfig', handleOpenScenarioConfig as EventListener)
    return () => {
      console.log('[ScenarioExplorer] 🔇 Event listener removed')
      window.removeEventListener('openScenarioConfig', handleOpenScenarioConfig as EventListener)
    }
  }, [])
  */

  // Get scenario details for direct config dialog
  const directConfigScenario = useMemo(() => {
    if (!directOpenConfig) return null

    const scenarioId = directOpenConfig.scenarioId
    const scenarioMetadata = getScenarioById(scenarioId)
    const legacyType: 'goal' | 'action' | 'event' = (scenarioMetadata as any)?.legacyType || 'goal'

    // Get definition
    const simplifiedTemplate = getTemplate(scenarioId)
    let definition = null
    let isSimplified = false

    if (simplifiedTemplate) {
      const fullDefinition = getScenarioDefinition(scenarioId)
      definition = {
        displayName: fullDefinition?.displayName || scenarioId,
        fields: simplifiedTemplate.fields,
        description: fullDefinition?.description,
        guidanceText: simplifiedTemplate.guidanceText || fullDefinition?.guidanceText
      }
      isSimplified = true
    } else {
      definition = getScenarioDefinition(scenarioId)
    }

    return { scenarioId, definition, isSimplified, legacyType }
  }, [directOpenConfig])

  // Group scenarios by theme using the registry
  const themeGroups = useMemo(() => {
    const themes = Object.values(ScenarioTheme)
    return themes.map(theme => {
      const allScenarios = getScenariosByTheme(theme)
      // Filter to show all scenarios that have been added to the user's plan (even if currently disabled)
      const activeScenarios = allScenarios.filter(s => state.scenarios[s.id] !== undefined)

      const metadata = THEME_METADATA[theme]
      return {
        theme,
        metadata,
        scenarios: activeScenarios
      }
    }).filter(group => group.scenarios.length > 0) // Hide empty themes
  }, [state.scenarios])

  const enabledScenarios = Object.values(state.scenarios).filter(s => s.enabled)
  const enabledCount = enabledScenarios.length
  const scenarioIds = enabledScenarios.map(s => s.id).join(', ') || '(none)'

  // Calculate total scenario count
  const totalScenarios = Object.keys(SCENARIO_REGISTRY).length

  return (
    <div className="scenario-explorer">
      {/* Debug Panel */}
      <div style={{
        padding: '12px',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '13px'
      }}>
        <strong style={{ color: '#f59e0b' }}>Debug:</strong> {enabledCount} scenarios enabled
        <br />
        <span style={{ color: '#94a3b8' }}>IDs: {scenarioIds}</span>
        <br />
        <span style={{ color: '#22c55e' }}>✓ Wave 2 - Thematic organization active ({totalScenarios} scenarios)</span>
      </div>

      {themeGroups.map(({ theme, metadata, scenarios }) => (
        <div key={theme} className="scenario-section">
          <h3>
            {metadata.displayName} ({scenarios.length})
          </h3>
          <p style={{
            fontSize: '13px',
            color: '#94a3b8',
            marginTop: '4px',
            marginBottom: '12px'
          }}>
            {metadata.description}
          </p>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <ScenarioItem
                key={scenario.id}
                scenarioId={scenario.id}
                displayName={scenario.displayName}
                theme={theme}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
