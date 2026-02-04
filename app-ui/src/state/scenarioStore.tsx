import React, { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { ScenarioId } from '../../../sim-core/src/config/index'
import { testProfiles } from '../data/testProfiles'
import type { TestProfile } from '../data/testProfiles'

/**
 * Wave 2: ScenarioConfig uses thematic ScenarioId for 'id' field
 * The 'type' field is kept for backward compatibility and UI categorization
 * 
 * TODO Wave 3: Remove 'type' field when legacy enum system is fully removed
 */
export interface ScenarioConfig {
  id: ScenarioId | string  // ScenarioId (thematic) - string for backward compatibility
  type: 'goal' | 'action' | 'event'  // Legacy categorization - kept for Wave 2
  enabled: boolean
  data: any
  _simplifiedInputs?: Record<string, any>  // User's original inputs for simplified scenarios (for form repopulation)
  scenarioMode?: 'legacy' | 'bespoke'  // Wave 2 dual-path: bespoke scenarios bypass legacy transformers
}

export type PensionType = 'employer_match' | 'salary_sacrifice' | 'personal_sipp'

export interface PensionPlan {
  id: string
  type: PensionType
  providerName: string
  balance: number

  // Common contribution fields
  employeePercent?: number  // For employer_match & salary_sacrifice
  employerPercent?: number  // For employer_match only

  // Salary sacrifice specific
  maxSacrificePercent?: number  // Prevent dropping below minimum wage

  // SIPP specific
  taxReliefMethod?: 'relief_at_source' | 'net_pay'
  monthlyContribution?: number  // Fixed monthly amount for SIPP
}

export interface PensionConfig {
  // New multi-plan structure
  plans: PensionPlan[]

  // Legacy fields for backward compatibility
  employeePercent?: number
  employerPercent?: number
}

export interface ScenarioState {
  selectedProfile: TestProfile
  currentAge: number
  retirementAge: number
  scenarios: Record<string, ScenarioConfig>
  pensionConfig?: PensionConfig
}

type ScenarioAction =
  | { type: 'SET_PROFILE'; profileId: string }
  | { type: 'SET_AGE'; age: number }
  | { type: 'SET_RETIREMENT_AGE'; age: number }
  | { type: 'TOGGLE_SCENARIO'; scenarioId: string }
  | { type: 'UPDATE_SCENARIO'; scenarioId: string; data: any; _simplifiedInputs?: Record<string, any> }
  | { type: 'ADD_SCENARIO'; scenario: ScenarioConfig }
  | { type: 'SET_PENSION_CONFIG'; config: PensionConfig }

const initialState: ScenarioState = {
  selectedProfile: testProfiles.alpha2,
  currentAge: testProfiles.alpha2.currentAge,
  retirementAge: testProfiles.alpha2.retirementAge,
  scenarios: {},
  pensionConfig: {
    plans: [
      {
        id: 'default-workplace',
        type: 'employer_match',
        providerName: 'Workplace Pension (L&G)',
        balance: 53000,
        employeePercent: 5,  // UK auto-enrolment minimum
        employerPercent: 3   // UK auto-enrolment minimum
      }
    ],
    // Legacy fields for backward compatibility
    employeePercent: 5,
    employerPercent: 3
  }
}

function scenarioReducer(state: ScenarioState, action: ScenarioAction): ScenarioState {
  console.log('[scenarioReducer] Action:', action.type, action)
  switch (action.type) {
    case 'SET_PROFILE':
      const profile = testProfiles[action.profileId]
      return {
        ...state,
        selectedProfile: profile,
        currentAge: profile.currentAge,
        retirementAge: profile.retirementAge,
        pensionConfig: {
          plans: [
            {
              id: 'default-workplace',
              type: 'employer_match',
              providerName: 'Workplace Pension',
              balance: profile.pensionBalance || 0,
              employeePercent: 5,  // Reset to UK auto-enrolment defaults
              employerPercent: 3
            }
          ],
          // Legacy fields for backward compatibility
          employeePercent: 5,
          employerPercent: 3
        }
      }
    case 'SET_AGE':
      return { ...state, currentAge: action.age }
    case 'SET_RETIREMENT_AGE':
      return { ...state, retirementAge: action.age }
    case 'TOGGLE_SCENARIO':
      // Only toggle if scenario exists, otherwise this is a bug
      if (!state.scenarios[action.scenarioId]) {
        console.error('[scenarioReducer] TOGGLE_SCENARIO called on non-existent scenario:', action.scenarioId)
        return state
      }
      // Toggle the enabled status
      return {
        ...state,
        scenarios: {
          ...state.scenarios,
          [action.scenarioId]: {
            ...state.scenarios[action.scenarioId],
            enabled: !state.scenarios[action.scenarioId].enabled
          }
        }
      }
    case 'UPDATE_SCENARIO':
      return {
        ...state,
        scenarios: {
          ...state.scenarios,
          [action.scenarioId]: {
            ...state.scenarios[action.scenarioId],
            enabled: true, // Auto-enable when configuration is saved
            data: action.data,  // Replace data completely, don't merge
            _simplifiedInputs: action._simplifiedInputs,  // Store simplified inputs separately
            // Preserve scenarioMode - critical for dual-path Wave 2 architecture
            scenarioMode: state.scenarios[action.scenarioId]?.scenarioMode
          }
        }
      }
    case 'ADD_SCENARIO':
      return {
        ...state,
        scenarios: {
          ...state.scenarios,
          [action.scenario.id]: action.scenario
        }
      }
    case 'SET_PENSION_CONFIG':
      return {
        ...state,
        pensionConfig: action.config
      }
    default:
      return state
  }
}

const ScenarioContext = createContext<{
  state: ScenarioState
  dispatch: React.Dispatch<ScenarioAction>
} | null>(null)

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scenarioReducer, initialState)
  return (
    <ScenarioContext.Provider value={{ state, dispatch }}>
      {children}
    </ScenarioContext.Provider>
  )
}

export function useScenarioStore() {
  const context = useContext(ScenarioContext)
  if (!context) {
    throw new Error('useScenarioStore must be used within ScenarioProvider')
  }
  return context
}
