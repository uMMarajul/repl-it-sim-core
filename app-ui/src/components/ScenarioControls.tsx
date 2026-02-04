import { useState, useEffect } from 'react'
import { useScenarioStore } from '../state/scenarioStore'
import { testProfiles } from '../data/testProfiles'
import { PensionConfigDialog } from './PensionConfigDialog'

type ParseResult = 
  | { kind: 'inRange'; parsed: number }
  | { kind: 'belowMin' | 'aboveMax' | 'empty' | 'nan'; parsed?: number }

function parseAge(value: string, min: number, max: number): ParseResult {
  if (value === '') return { kind: 'empty' }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return { kind: 'nan' }
  if (parsed < min) return { kind: 'belowMin', parsed }
  if (parsed > max) return { kind: 'aboveMax', parsed }
  return { kind: 'inRange', parsed }
}

export function ScenarioControls() {
  const { state, dispatch } = useScenarioStore()
  const [currentAgeInput, setCurrentAgeInput] = useState(state.currentAge.toString())
  const [currentAgeDirty, setCurrentAgeDirty] = useState(false)
  const [retirementAgeInput, setRetirementAgeInput] = useState(state.retirementAge.toString())
  const [retirementAgeDirty, setRetirementAgeDirty] = useState(false)
  const [showPensionDialog, setShowPensionDialog] = useState(false)

  useEffect(() => {
    if (!currentAgeDirty) {
      setCurrentAgeInput(state.currentAge.toString())
    }
  }, [state.currentAge, currentAgeDirty])

  useEffect(() => {
    if (!retirementAgeDirty) {
      setRetirementAgeInput(state.retirementAge.toString())
    }
  }, [state.retirementAge, retirementAgeDirty])

  const handleCurrentAgeChange = (raw: string) => {
    setCurrentAgeInput(raw)
    setCurrentAgeDirty(true)
    const result = parseAge(raw, 18, 100)
    if (result.kind === 'inRange' && result.parsed !== state.currentAge) {
      dispatch({ type: 'SET_AGE', age: result.parsed })
    }
  }

  const handleCurrentAgeBlur = () => {
    const result = parseAge(currentAgeInput, 18, 100)
    const next = (() => {
      switch (result.kind) {
        case 'inRange':
          return result.parsed
        case 'belowMin':
        case 'empty':
        case 'nan':
          return 18
        case 'aboveMax':
          return 100
      }
    })()
    if (next !== state.currentAge) {
      dispatch({ type: 'SET_AGE', age: next })
    }
    setCurrentAgeInput(String(next))
    setCurrentAgeDirty(false)
  }

  const handleRetirementAgeChange = (raw: string) => {
    setRetirementAgeInput(raw)
    setRetirementAgeDirty(true)
    const result = parseAge(raw, 50, 75)
    if (result.kind === 'inRange' && result.parsed !== state.retirementAge) {
      dispatch({ type: 'SET_RETIREMENT_AGE', age: result.parsed })
    }
  }

  const handleRetirementAgeBlur = () => {
    const result = parseAge(retirementAgeInput, 50, 75)
    const next = (() => {
      switch (result.kind) {
        case 'inRange':
          return result.parsed
        case 'belowMin':
        case 'empty':
        case 'nan':
          return 50
        case 'aboveMax':
          return 75
      }
    })()
    if (next !== state.retirementAge) {
      dispatch({ type: 'SET_RETIREMENT_AGE', age: next })
    }
    setRetirementAgeInput(String(next))
    setRetirementAgeDirty(false)
  }

  return (
    <div className="scenario-controls">
      <h2>Scenario Controls</h2>
      
      <div className="control-group">
        <label htmlFor="profile-select">Test Dataset</label>
        <select
          id="profile-select"
          value={state.selectedProfile.id}
          onChange={(e) => dispatch({ type: 'SET_PROFILE', profileId: e.target.value })}
        >
          {Object.values(testProfiles).map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <p className="description">{state.selectedProfile.description}</p>
      </div>

      <div className="control-group">
        <label htmlFor="current-age">Current Age</label>
        <input
          id="current-age"
          type="number"
          min="18"
          max="100"
          value={currentAgeInput}
          onChange={(e) => handleCurrentAgeChange(e.target.value)}
          onBlur={handleCurrentAgeBlur}
        />
      </div>

      <div className="control-group">
        <label htmlFor="retirement-age">Retirement Age</label>
        <input
          id="retirement-age"
          type="number"
          min="50"
          max="75"
          value={retirementAgeInput}
          onChange={(e) => handleRetirementAgeChange(e.target.value)}
          onBlur={handleRetirementAgeBlur}
        />
        <p className="description">
          State pension (£11,500/year) starts at age 67. Private pension withdrawals begin at your retirement age.
        </p>
      </div>

      <div className="profile-summary">
        <h3>Profile Summary</h3>
        <div className="summary-item">
          <span>Annual Salary:</span>
          <span>£{state.selectedProfile.currentSalary.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span>Monthly Expenses:</span>
          <span>£{state.selectedProfile.monthlyExpenses.toLocaleString()}</span>
        </div>
        {state.selectedProfile.id === 'alpha2' ? (
          <>
            <div className="summary-item">
              <span>Private ISA:</span>
              <span>£110,000</span>
            </div>
            <div className="summary-item">
              <span>Workplace Pension:</span>
              <span>£53,000</span>
            </div>
            <div className="summary-item">
              <span>House Share:</span>
              <span>£123,333</span>
            </div>
            <div className="summary-item" style={{ color: '#ef4444' }}>
              <span>Mortgage (50%):</span>
              <span>-£173,129</span>
            </div>
            <div className="summary-item" style={{ fontWeight: 'bold', borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
              <span>Net Wealth:</span>
              <span>£113,204</span>
            </div>
          </>
        ) : (
          <>
            <div className="summary-item">
              <span>Pension Balance:</span>
              <span>£{state.selectedProfile.pensionBalance.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Regular Contributions Summary */}
      {state.selectedProfile.id === 'alpha2' && (
        <div className="profile-summary" style={{ marginTop: '16px' }}>
          <h3>💰 Regular Contributions</h3>
          <div className="summary-item">
            <span>Mortgage Payment (50% share):</span>
            <span>£2,220/mo</span>
          </div>
          <div className="summary-item" style={{ color: '#10b981' }}>
            <span>ISA Target:</span>
            <span>£1,667/mo (£20k/yr max)</span>
          </div>
          <div className="summary-item" style={{ color: '#10b981' }}>
            <span>Pension Plans:</span>
            <button 
              onClick={() => setShowPensionDialog(true)}
              style={{ 
                color: '#60a5fa', 
                textDecoration: 'underline',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit'
              }}
            >
              {state.pensionConfig?.plans && state.pensionConfig.plans.length > 0
                ? `${state.pensionConfig.plans.length} plan${state.pensionConfig.plans.length > 1 ? 's' : ''} active (Click to manage)`
                : 'Click to configure'}
            </button>
          </div>
          {state.pensionConfig?.plans && state.pensionConfig.plans.length > 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '16px', marginTop: '4px' }}>
              {state.pensionConfig.plans.map((plan) => (
                <div key={plan.id} style={{ marginTop: '2px' }}>
                  • {plan.providerName}: {
                    plan.type === 'employer_match' ? `${plan.employeePercent}% + ${plan.employerPercent}%` :
                    plan.type === 'salary_sacrifice' ? `${plan.employeePercent}% (salary sacrifice)` :
                    `£${plan.monthlyContribution}/mo (SIPP)`
                  }
                </div>
              ))}
            </div>
          )}
          <p className="description" style={{ marginTop: '12px', fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
            • Maximizing ISA allowance (£20k/year)<br/>
            • Optimizing pension for employer matching<br/>
            • Salary sacrifice applied to bonus
          </p>
        </div>
      )}
      
      {showPensionDialog && (
        <PensionConfigDialog onClose={() => setShowPensionDialog(false)} />
      )}
    </div>
  )
}
