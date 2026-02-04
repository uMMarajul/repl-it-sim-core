/**
 * SCENARIO METADATA - Field Definitions and Configuration Schema
 * 
 * This module defines the complete metadata schema for scenario configuration,
 * consolidating field definitions from multiple legacy sources:
 * - goalDefinitions.ts
 * - actionEventFields.ts
 * - simplifiedTemplates.ts
 * 
 * Design Principles:
 * - Single source of truth for all scenario metadata
 * - Type-safe field definitions
 * - Reusable across sim-core and app-ui
 * - Support for conditional fields and validation
 * 
 * Migration Status: Wave 0.3 - Metadata Schema
 */

import type { ConfigField } from './configSchema'

// ============================================================================
// FIELD METADATA
// ============================================================================

/**
 * Extended field configuration for scenarios
 * Combines ConfigField with UI-specific metadata
 */
export interface ScenarioField extends Omit<ConfigField<any>, 'section' | 'advanced'> {
  /** User-friendly help text shown in UI */
  helpText?: string
  
  /** Whether this field is required */
  required?: boolean
  
  /** Minimum value (for number/currency/percentage fields) */
  min?: number
  
  /** Maximum value (for number/currency/percentage fields) */
  max?: number
  
  /** Step increment (for number fields) */
  step?: number
  
  /** Conditional visibility (field only shows if condition is met) */
  visibleIf?: FieldCondition
  
  /** Dependencies (other fields that affect this field's validation) */
  dependencies?: string[]
  
  /** Custom validation function */
  validate?: (value: any, allValues: Record<string, any>) => string | null
  
  /** Options for select/radio fields */
  options?: Array<{ value: string; label: string }>
}

/**
 * Conditional field visibility
 */
export interface FieldCondition {
  /** Field name to check */
  field: string
  
  /** Comparison operator */
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains'
  
  /** Value to compare against */
  value: any
}

/**
 * Complete scenario configuration template
 */
export interface ScenarioTemplate {
  /** Scenario unique identifier */
  id: string
  
  /** Configuration fields for this scenario */
  fields: ScenarioField[]
  
  /** User guidance text */
  guidanceText?: string
  
  /** Default values for instant activation */
  defaults?: Record<string, any>
  
  /** Example configurations (for help/documentation) */
  examples?: ScenarioExample[]
}

/**
 * Example configuration for a scenario
 */
export interface ScenarioExample {
  /** Example name */
  name: string
  
  /** Description of this example */
  description: string
  
  /** Example field values */
  values: Record<string, any>
}

// ============================================================================
// COMMON FIELD TEMPLATES
// ============================================================================

/**
 * Commonly used field configurations (DRY principle)
 * These can be reused across multiple scenarios
 */
export const COMMON_FIELDS = {
  /** Standard date field for scenario start */
  startDate: (defaultMonthsFromNow: number = 6, helpText?: string): ScenarioField => ({
    key: 'startDate',
    label: 'Start Date',
    controlType: 'month_year' as const,
    defaultValue: getDefaultTargetDate(defaultMonthsFromNow),
    helpText: helpText || 'When does this scenario begin?',
    required: true
  }),
  
  /** Standard date field for scenario target/end */
  targetDate: (defaultMonthsFromNow: number = 12, helpText?: string): ScenarioField => ({
    key: 'targetDate',
    label: 'Target Date',
    controlType: 'month_year' as const,
    defaultValue: getDefaultTargetDate(defaultMonthsFromNow),
    helpText: helpText || 'When do you want to achieve this?',
    required: true
  }),
  
  /** One-off cost/expense */
  oneOffCost: (label: string, defaultValue: number, helpText?: string): ScenarioField => ({
    key: 'oneOffCost',
    label,
    controlType: 'currency' as const,
    units: '£',
    defaultValue,
    helpText: helpText || 'Total one-time cost',
    required: true,
    min: 0
  }),
  
  /** Monthly recurring amount */
  monthlyAmount: (label: string, defaultValue: number, helpText?: string): ScenarioField => ({
    key: 'monthlyAmount',
    label,
    controlType: 'currency' as const,
    units: '£/month',
    defaultValue,
    helpText: helpText || 'Monthly recurring amount',
    required: true,
    min: 0
  }),
  
  /** Duration in years */
  durationYears: (defaultValue: number, helpText?: string): ScenarioField => ({
    key: 'durationYears',
    label: 'Duration',
    controlType: 'number' as const,
    units: 'years',
    defaultValue,
    helpText: helpText || 'How many years will this last?',
    required: true,
    min: 1,
    max: 50
  }),
  
  /** Percentage field */
  percentage: (key: string, label: string, defaultValue: number, helpText?: string): ScenarioField => ({
    key,
    label,
    controlType: 'percentage' as const,
    units: '%',
    defaultValue,
    helpText,
    required: true,
    min: 0,
    max: 100
  }),
  
  /** Account type selector */
  accountType: (helpText?: string): ScenarioField => ({
    key: 'accountType',
    label: 'Account Type',
    controlType: 'select' as const,
    options: [
      { value: 'isa', label: 'ISA (tax-free)' },
      { value: 'gia', label: 'General Investment Account' },
      { value: 'pension', label: 'Pension / SIPP' },
      { value: 'hysa', label: 'High-Yield Savings Account' }
    ],
    defaultValue: 'isa',
    helpText: helpText || 'Which account type should this affect?'
  })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default date X months from simulation start
 */
export function getDefaultTargetDate(monthsFromNow: number): Date {
  const date = new Date(2025, 0, 1)  // Simulation default start
  date.setMonth(date.getMonth() + monthsFromNow)
  return date
}

/**
 * Get default date at specific age
 */
export function getDefaultDateAtAge(targetAge: number, currentAge: number = 34): Date {
  const yearsUntilTarget = targetAge - currentAge
  const date = new Date(2025, 0, 1)
  date.setFullYear(date.getFullYear() + yearsUntilTarget)
  return date
}

/**
 * Extract default values from a scenario template
 * Used for instant activation when scenario checkbox is toggled
 */
export function getDefaultsFromTemplate(template: ScenarioTemplate): Record<string, any> {
  const defaults: Record<string, any> = {}
  
  for (const field of template.fields) {
    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue
    }
  }
  
  return defaults
}

/**
 * Validate scenario configuration data against template
 */
export function validateScenarioData(
  template: ScenarioTemplate,
  data: Record<string, any>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  for (const field of template.fields) {
    // Check required fields
    if (field.required && (data[field.key] === undefined || data[field.key] === null)) {
      errors[field.key] = `${field.label} is required`
      continue
    }
    
    const value = data[field.key]
    if (value === undefined || value === null) continue
    
    // Validate number ranges
    if (field.controlType === 'number' || field.controlType === 'currency' || field.controlType === 'percentage') {
      if (field.min !== undefined && value < field.min) {
        errors[field.key] = `${field.label} must be at least ${field.min}`
      }
      if (field.max !== undefined && value > field.max) {
        errors[field.key] = `${field.label} must be at most ${field.max}`
      }
    }
    
    // Custom validation
    if (field.validate) {
      const error = field.validate(value, data)
      if (error) {
        errors[field.key] = error
      }
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Check if a field should be visible based on conditions
 */
export function isFieldVisible(field: ScenarioField, allValues: Record<string, any>): boolean {
  if (!field.visibleIf) return true
  
  const condition = field.visibleIf
  const fieldValue = allValues[condition.field]
  
  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value
    case 'notEquals':
      return fieldValue !== condition.value
    case 'greaterThan':
      return fieldValue > condition.value
    case 'lessThan':
      return fieldValue < condition.value
    case 'contains':
      return Array.isArray(fieldValue) && fieldValue.includes(condition.value)
    default:
      return true
  }
}
