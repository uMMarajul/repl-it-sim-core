// Shared types used across the simulation engine

// Field definitions for configuration forms
export type ControlType =
  | 'currency'
  | 'percentage'
  | 'number'
  | 'text'
  | 'date'
  | 'month_year'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'slider'
  | 'textarea'
  | 'account_picker'

export interface ChoiceOption {
  value: string
  label: string
  helpText?: string
}

export interface FieldDefinition {
  key: string
  label: string
  controlType: ControlType
  defaultValue?: any
  min?: number
  max?: number
  step?: number
  units?: string
  helpText?: string
  tooltip?: string
  choices?: ChoiceOption[]
  conditional?: {
    dependsOn: string
    value: any
  }
  section?: 'core' | 'advanced'
}

// Date and time types
export type FrequencyType = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly"

export interface AmountWithFrequency {
  amount: number
  frequency: FrequencyType
}
