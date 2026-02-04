import { useState, useEffect } from 'react'
import { useScenarioStore } from '../state/scenarioStore'
import type { ConfigField } from '../../../sim-core/src/config/configSchema'
import { transformSimplifiedConfig } from '../config/configTransformers'
import { getScenarioById } from '../../../sim-core/src/config/index'
import '../styles/ConfigDialog.css'

interface ConfigDialogProps {
  scenarioId: string
  scenarioName: string
  fields: ConfigField<any>[]
  description?: string
  guidanceText?: string
  onClose: () => void
  onSave?: (scenarioName: string) => void // NEW
  isSimplified?: boolean
  scenarioType?: 'goal' | 'action' | 'event'
  initialValues?: Record<string, any>
}

export function ConfigDialog({
  scenarioId,
  scenarioName,
  fields,
  description,
  guidanceText,
  onClose,
  onSave, // NEW
  isSimplified = false,
  scenarioType = 'goal',
  initialValues = {}
}: ConfigDialogProps) {
  const { state, dispatch } = useScenarioStore()
  const existingScenario = state.scenarios[scenarioId]

  // For simplified scenarios, load from _simplifiedInputs if available (user's original inputs)
  // Otherwise load the full config data (for non-simplified or first-time configuration)
  const storeData = isSimplified && existingScenario?._simplifiedInputs
    ? existingScenario._simplifiedInputs
    : (existingScenario?.data || {})

  // Merge store data with AI-provided initial values (AI values take precedence for new/overlay)
  // Normalize AI values (e.g., convert date strings to Date objects, currency strings to numbers)
  const normalizedInitialValues = { ...initialValues }

  if (initialValues) {
    Object.keys(initialValues).forEach(key => {
      const val = initialValues[key]
      const field = fields.find(f => f.key === key)

      if (!field || val === undefined || val === null) return

      // date / month_year -> Convert string 'YYYY-MM-DD' to Date
      if ((field.controlType === 'date' || field.controlType === 'month_year') && typeof val === 'string') {
        const date = new Date(val)
        if (!isNaN(date.getTime())) {
          normalizedInitialValues[key] = date
        }
      }

      // currency / number -> Convert string '$100,000' to number 100000
      if ((field.controlType === 'currency' || field.controlType === 'number' || field.controlType === 'percentage' || field.controlType === 'duration_years') && typeof val === 'string') {
        // Remove currency symbols, commas, spaces
        const numStr = val.replace(/[^0-9.-]/g, '')
        const num = parseFloat(numStr)
        if (!isNaN(num)) {
          normalizedInitialValues[key] = num
        }
      }
    })
  }

  const initialData = { ...storeData, ...normalizedInitialValues }

  const [formData, setFormData] = useState<Record<string, any>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data with default values - run whenever fields change to support dynamic defaults
  useEffect(() => {
    const initializeDefaults = () => {
      const newData: Record<string, any> = { ...formData }
      let hasChanges = false

      fields.forEach(field => {
        if (newData[field.key] === undefined) {
          let defaultVal = field.defaultValue
          if (typeof defaultVal === 'function') {
            defaultVal = defaultVal(newData)
          }
          newData[field.key] = defaultVal
          hasChanges = true
        }
      })

      if (hasChanges) {
        setFormData(newData)
      }
    }

    initializeDefaults()
  }, [fields])

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
    // Clear error when user makes a change
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  const handleSave = (e?: React.MouseEvent) => {
    e?.preventDefault()

    // Basic validation
    const newErrors: Record<string, string> = {}
    fields.forEach(field => {
      // Check if field should be shown
      const shouldShow = field.showIf ? field.showIf(formData) : true
      if (!shouldShow) return

      if (field.required && (formData[field.key] === undefined || formData[field.key] === '')) {
        newErrors[field.key] = `${field.label} is required`
      }

      // Run field-specific validation if available
      if (field.validate && formData[field.key] !== undefined) {
        const error = field.validate(formData[field.key], formData)
        if (error) newErrors[field.key] = error
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Convert Date objects to ISO strings and remove undefined values for proper serialization
    const serializedData: Record<string, any> = {}
    Object.keys(formData).forEach(key => {
      const value = formData[key]
      // Skip undefined values - they should not be persisted
      if (value === undefined) {
        return
      }
      // Convert Date to ISO string
      if (value instanceof Date) {
        serializedData[key] = value.toISOString()
      } else {
        serializedData[key] = value
      }
    })

    // Wave 2 dual-path: Check if this is a bespoke scenario
    // Defensive fallback: Check state first, then registry
    const scenarioMetadata = getScenarioById(scenarioId as any)
    const isBespoke = existingScenario?.scenarioMode === 'bespoke' ||
      (scenarioMetadata as any)?.scenarioMode === 'bespoke'

    if (isBespoke) {
      // Bespoke scenarios: Save directly without legacy transformers
      console.log('[ConfigDialog] Bespoke scenario - saving without transformation:', serializedData)
      dispatch({
        type: 'UPDATE_SCENARIO',
        scenarioId,
        data: serializedData,  // Save serialized data directly (already schema-compliant from archetype defaults)
        _simplifiedInputs: serializedData  // Store for form repopulation
      })
    } else if (isSimplified) {
      // Legacy simplified scenarios: Transform and store separately
      const transformedData = transformSimplifiedConfig(scenarioType, scenarioId, serializedData, state.selectedProfile)
      console.log('[ConfigDialog] Legacy simplified - transformed data:', { from: serializedData, to: transformedData })

      dispatch({
        type: 'UPDATE_SCENARIO',
        scenarioId,
        data: transformedData,              // Clean, schema-compliant config for sim-core
        _simplifiedInputs: serializedData   // Original user inputs for form repopulation
      })
    } else {
      // Legacy full config scenarios: Save as-is
      dispatch({
        type: 'UPDATE_SCENARIO',
        scenarioId,
        data: serializedData
      })
    }

    // Notify parent if callback provided
    if (onSave) {
      onSave(formData['scenarioName'] || scenarioName)
    }
    onClose()
  }

  const renderField = (field: ConfigField<any>) => {
    // Check conditional display
    const shouldShow = field.showIf ? field.showIf(formData) : true
    if (!shouldShow) return null

    const value = formData[field.key]
    const error = errors[field.key]


    return (
      <div key={field.key} className="form-field">
        <label className="field-label">
          {field.label}
          {field.controlType === 'currency' && field.units && ` (${field.units})`}
          {field.required && <span className="required">*</span>}
        </label>

        {renderControl(field, value)}

        {field.helpText && (
          <p className="field-help">{field.helpText}</p>
        )}
        {error && (
          <p className="field-error">{error}</p>
        )}
      </div>
    )
  }

  const renderControl = (field: ConfigField<any>, value: any) => {
    const onChange = (val: any) => handleFieldChange(field.key, val)

    switch (field.controlType) {
      case 'currency':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              if (e.target.value === '') {
                onChange(undefined)
              } else {
                onChange(parseFloat(e.target.value) || 0)
              }
            }}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            className="form-input"
          />
        )

      case 'number':
        return (
          <div className="input-group">
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                if (e.target.value === '') {
                  onChange(undefined)
                } else {
                  onChange(parseFloat(e.target.value) || 0)
                }
              }}
              min={field.min}
              max={field.max}
              step={field.step || 1}
              className="form-input"
            />
            {field.units && <span className="input-suffix">{field.units}</span>}
          </div>
        )

      case 'percentage':
        return (
          <div className="input-group">
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                if (e.target.value === '') {
                  onChange(undefined)
                } else {
                  onChange(parseFloat(e.target.value) || 0)
                }
              }}
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step || 0.1}
              className="form-input"
            />
            <span className="input-suffix">%</span>
          </div>
        )

      case 'duration_years':
        return (
          <div className="input-group">
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                if (e.target.value === '') {
                  onChange(undefined)
                } else {
                  onChange(parseFloat(e.target.value) || 0)
                }
              }}
              min={field.min ?? 0}
              max={field.max ?? 50}
              step={field.step || 0.1}
              className="form-input"
            />
            <span className="input-suffix">years</span>
          </div>
        )

      case 'select':
        const selectValue = value !== undefined && value !== null ? String(value) : (field.defaultValue !== undefined ? String(field.defaultValue) : '')
        return (
          <select
            value={selectValue}
            onChange={(e) => {
              // Map empty string to undefined for optional fields
              if (e.target.value === '') {
                onChange(undefined)
                return
              }
              // Find the original choice to preserve type
              const selectedChoice = field.choices?.find(c => String(c.value) === e.target.value)
              const typedValue = selectedChoice ? selectedChoice.value : e.target.value
              onChange(typedValue)
            }}
            className="form-select"
          >
            {!field.required && <option value="">-- Select an option --</option>}
            {field.choices?.map((choice) => (
              <option key={String(choice.value)} value={String(choice.value)}>
                {choice.label}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="radio-group">
            {field.choices?.map((choice) => (
              <label key={String(choice.value)} className="radio-label">
                <input
                  type="radio"
                  name={field.key}
                  value={String(choice.value)}
                  checked={String(value) === String(choice.value)}
                  onChange={() => onChange(choice.value)}
                />
                <div>
                  <span className="radio-text">{choice.label}</span>
                  {choice.description && (
                    <span className="radio-description">{choice.description}</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )

      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>Yes</span>
          </label>
        )

      case 'date':
        // Handle both Date objects and ISO strings
        let fullDateValue = ''
        if (value instanceof Date && !isNaN(value.getTime())) {
          fullDateValue = value.toISOString().substring(0, 10)
        } else if (typeof value === 'string' && value) {
          fullDateValue = value.substring(0, 10)
        }
        return (
          <input
            type="date"
            value={fullDateValue}
            onChange={(e) => {
              // Map empty string to undefined for optional fields
              if (e.target.value === '') {
                onChange(undefined)
              } else {
                const newDate = new Date(e.target.value)
                if (!isNaN(newDate.getTime())) {
                  onChange(newDate)
                }
              }
            }}
            className="form-input"
          />
        )

      case 'month_year':
        // Handle both Date objects and ISO strings
        let monthYearValue = ''
        if (value instanceof Date && !isNaN(value.getTime())) {
          monthYearValue = value.toISOString().substring(0, 7)
        } else if (typeof value === 'string' && value) {
          monthYearValue = value.substring(0, 7)
        }
        return (
          <input
            type="month"
            value={monthYearValue}
            onChange={(e) => {
              // Map empty string to undefined for optional fields
              if (e.target.value === '') {
                onChange(undefined)
              } else {
                const newDate = new Date(e.target.value + '-01')
                if (!isNaN(newDate.getTime())) {
                  onChange(newDate)
                }
              }
            }}
            className="form-input"
          />
        )

      case 'duration_months':
        return (
          <div className="input-group">
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                if (e.target.value === '') {
                  onChange(undefined)
                } else {
                  onChange(parseFloat(e.target.value) || 0)
                }
              }}
              min={field.min ?? 0}
              max={field.max ?? 120}
              step={field.step || 1}
              className="form-input"
            />
            <span className="input-suffix">months</span>
          </div>
        )

      case 'multi_select':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="multi-select-group">
            {field.choices?.map((choice) => (
              <label key={String(choice.value)} className="checkbox-label multi-select-option">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(choice.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, choice.value]
                      : selectedValues.filter(v => v !== choice.value)
                    onChange(newValues)
                  }}
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </div>
        )

      case 'text':
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="form-input"
          />
        )

      default:
        return <p className="field-unsupported">Unsupported field type: {field.controlType}</p>
    }
  }

  // Group fields by section
  const coreFields = fields.filter(f => !f.section || f.section === 'core')
  const advancedFields = fields.filter(f => f.section === 'advanced')

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content config-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{formData['scenarioName'] || scenarioName}</h2>
          <button type="button" className="close-btn" onClick={onClose}>Close</button>
        </div>

        {description && (
          <p className="dialog-description">{description}</p>
        )}

        <div className="dialog-body">
          <div className="form-section">
            <h3>Configuration</h3>
            {coreFields.map(renderField)}
          </div>

          {advancedFields.length > 0 && (
            <details className="form-section advanced-section">
              <summary>Advanced Options</summary>
              {advancedFields.map(renderField)}
            </details>
          )}
        </div>

        {guidanceText && (
          <div className="guidance-box">
            <strong>💡 Guidance:</strong>
            <p>{guidanceText}</p>
          </div>
        )}

        <div className="dialog-footer">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleSave} className="btn-primary">Save Configuration</button>
        </div>
      </div>
    </div>
  )
}
