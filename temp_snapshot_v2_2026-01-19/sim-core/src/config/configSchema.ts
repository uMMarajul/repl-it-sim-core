import { ScenarioArchetype } from './archetypes'

export type FieldControlType =
  | 'currency'           // Money amounts (£)
  | 'percentage'         // Percentages (%)
  | 'number'             // Generic numbers
  | 'text'               // Text input
  | 'boolean'            // True/false toggle/checkbox
  | 'date'               // Full date picker
  | 'month_year'         // Month/year picker (YYYY-MM)
  | 'duration_years'     // Duration in years
  | 'duration_months'    // Duration in months
  | 'select'             // Dropdown selection
  | 'radio'              // Radio button choice
  | 'multi_select'       // Multiple selections
  | 'account_picker'     // Account selection dropdown

export interface FieldChoice {
  value: string | number | boolean
  label: string
  description?: string
}

export interface ConfigField<TContext = any> {
  key: string
  label: string
  controlType: FieldControlType
  helpText?: string
  required?: boolean
  defaultValue?: any
  units?: string
  min?: number
  max?: number
  step?: number
  choices?: FieldChoice[]
  showIf?: (context: TContext) => boolean
  validate?: (value: any, context: TContext) => string | null
  section?: 'core' | 'advanced'
}
