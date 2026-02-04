import { useState } from 'react'
import { useScenarioStore } from '../state/scenarioStore'
import type { PensionPlan, PensionType } from '../state/scenarioStore'

interface PensionConfigDialogProps {
  onClose: () => void
}

export function PensionConfigDialog({ onClose }: PensionConfigDialogProps) {
  const { state, dispatch } = useScenarioStore()
  
  const currentPlans = state.pensionConfig?.plans || [{
    id: 'default-workplace',
    type: 'employer_match' as PensionType,
    providerName: 'Workplace Pension',
    balance: 53000,
    employeePercent: 5,
    employerPercent: 3
  }]
  
  const [plans, setPlans] = useState<PensionPlan[]>(currentPlans)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const currentSalary = state.selectedProfile.currentSalary

  const addNewPlan = (type: PensionType) => {
    const newPlan: PensionPlan = {
      id: `plan-${Date.now()}`,
      type,
      providerName: type === 'employer_match' ? 'New Workplace Pension' 
        : type === 'salary_sacrifice' ? 'Salary Sacrifice Scheme'
        : 'Personal SIPP',
      balance: 0,
      employeePercent: type === 'personal_sipp' ? undefined : 5,
      employerPercent: type === 'personal_sipp' ? undefined : 3,
      monthlyContribution: type === 'personal_sipp' ? 200 : undefined,
      taxReliefMethod: type === 'personal_sipp' ? 'relief_at_source' : undefined
    }
    setPlans([...plans, newPlan])
    setSelectedPlanIndex(plans.length)
  }

  const removePlan = (index: number) => {
    if (plans.length === 1) {
      alert('You must have at least one pension plan')
      return
    }
    const newPlans = plans.filter((_, i) => i !== index)
    setPlans(newPlans)
    setSelectedPlanIndex(Math.max(0, selectedPlanIndex - 1))
  }

  const updatePlan = (index: number, updates: Partial<PensionPlan>) => {
    const newPlans = [...plans]
    newPlans[index] = { ...newPlans[index], ...updates }
    setPlans(newPlans)
  }

  const handleSave = () => {
    // Validate plans
    for (const plan of plans) {
      if (plan.type === 'employer_match' && (!plan.employeePercent || !plan.employerPercent)) {
        alert('Employer matching plans must have both employee and employer percentages')
        return
      }
      if (plan.type === 'salary_sacrifice' && !plan.employeePercent) {
        alert('Salary sacrifice plans must have an employee percentage')
        return
      }
      if (plan.type === 'personal_sipp' && !plan.monthlyContribution) {
        alert('SIPP plans must have a monthly contribution amount')
        return
      }
    }

    // Calculate legacy fields from first EMPLOYER_MATCH plan for backward compatibility
    // (don't use salary sacrifice or SIPP plans for legacy fields)
    const firstEmployerMatchPlan = plans.find(p => p.type === 'employer_match')
    const legacyEmployeePercent = firstEmployerMatchPlan?.employeePercent || 5
    const legacyEmployerPercent = firstEmployerMatchPlan?.employerPercent || 3

    dispatch({
      type: 'SET_PENSION_CONFIG',
      config: {
        plans,
        employeePercent: legacyEmployeePercent,
        employerPercent: legacyEmployerPercent
      }
    })
    onClose()
  }

  const selectedPlan = plans[selectedPlanIndex]
  
  // Calculate monthly cost and tax savings (matches useSimulation.ts calculations)
  const calculateMonthlyCost = (plan: PensionPlan) => {
    if (plan.type === 'employer_match' && plan.employeePercent) {
      // Standard employer match: employee pays out of net salary, gets tax relief
      const employeeGross = (currentSalary * plan.employeePercent / 100) / 12
      const taxRelief = employeeGross * 0.20  // Basic rate tax relief
      const netCost = employeeGross - taxRelief
      const employerContribution = plan.employerPercent ? (currentSalary * plan.employerPercent / 100) / 12 : 0
      const totalToPension = employeeGross + employerContribution
      return { netCost, taxRelief, employerContribution, grossContribution: totalToPension }
    } else if (plan.type === 'salary_sacrifice' && plan.employeePercent) {
      // Salary sacrifice: employee sacrifices pre-tax salary, saves both tax and NI
      const employeeSacrifice = (currentSalary * plan.employeePercent / 100) / 12
      const taxSavings = employeeSacrifice * 0.20  // Income tax savings
      const niSavings = employeeSacrifice * 0.08   // NI savings (8% for employees)
      const totalSavings = taxSavings + niSavings
      const netCost = employeeSacrifice - totalSavings
      const employerMatch = plan.employerPercent ? (currentSalary * plan.employerPercent / 100) / 12 : 0
      const totalToPension = employeeSacrifice + employerMatch
      return { netCost, taxRelief: totalSavings, employerContribution: employerMatch, grossContribution: totalToPension }
    } else if (plan.type === 'personal_sipp' && plan.monthlyContribution) {
      // SIPP relief-at-source: user pays net (80%), HMRC adds 25% of net (= 20% of gross)
      // Example: Pay £80 net → HMRC adds £20 → Total £100 in pension
      const netCost = plan.monthlyContribution
      const hmrcGrossUp = plan.monthlyContribution * 0.25  // 25% of net = 20% of gross
      const totalToPension = netCost + hmrcGrossUp
      return { netCost, taxRelief: hmrcGrossUp, employerContribution: 0, grossContribution: totalToPension }
    }
    return { netCost: 0, taxRelief: 0, employerContribution: 0, grossContribution: 0 }
  }

  const costs = calculateMonthlyCost(selectedPlan)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>Configure Pension Plans</h2>
        
        {/* Plan Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {plans.map((plan, index) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanIndex(index)}
              style={{
                padding: '8px 16px',
                background: selectedPlanIndex === index ? '#3b82f6' : '#e5e7eb',
                color: selectedPlanIndex === index ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {plan.providerName}
              {plans.length > 1 && (
                <span 
                  onClick={(e) => { e.stopPropagation(); removePlan(index) }}
                  style={{ marginLeft: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ×
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Add New Plan Buttons */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => addNewPlan('employer_match')}
            style={{ 
              padding: '6px 12px', 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + Employer Match
          </button>
          <button 
            onClick={() => addNewPlan('salary_sacrifice')}
            style={{ 
              padding: '6px 12px', 
              background: '#8b5cf6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + Salary Sacrifice
          </button>
          <button 
            onClick={() => addNewPlan('personal_sipp')}
            style={{ 
              padding: '6px 12px', 
              background: '#f59e0b', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + Personal SIPP
          </button>
        </div>

        {/* Plan Configuration Form */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0 }}>
            {selectedPlan.type === 'employer_match' ? 'Employer Matching Pension' :
             selectedPlan.type === 'salary_sacrifice' ? 'Salary Sacrifice Scheme' :
             'Personal SIPP'}
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Provider Name
            </label>
            <input
              type="text"
              value={selectedPlan.providerName}
              onChange={(e) => updatePlan(selectedPlanIndex, { providerName: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Current Balance (£)
            </label>
            <input
              type="number"
              value={selectedPlan.balance}
              onChange={(e) => updatePlan(selectedPlanIndex, { balance: Number(e.target.value) })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            />
          </div>

          {selectedPlan.type !== 'personal_sipp' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                  Employee Contribution (% of salary)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={selectedPlan.employeePercent || 5}
                  onChange={(e) => updatePlan(selectedPlanIndex, { employeePercent: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
                <small style={{ color: '#6b7280' }}>UK minimum: 5% for auto-enrolment</small>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                  Employer Contribution (% of salary)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={selectedPlan.employerPercent || 3}
                  onChange={(e) => updatePlan(selectedPlanIndex, { employerPercent: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
                <small style={{ color: '#6b7280' }}>UK minimum: 3% for auto-enrolment</small>
              </div>
            </>
          )}

          {selectedPlan.type === 'personal_sipp' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                Monthly Contribution (£)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={selectedPlan.monthlyContribution || 200}
                onChange={(e) => updatePlan(selectedPlanIndex, { monthlyContribution: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
              <small style={{ color: '#6b7280' }}>Relief-at-source: You pay 80%, HMRC adds 20%</small>
            </div>
          )}

          {/* Cost Breakdown */}
          <div style={{ 
            background: '#f3f4f6', 
            padding: '16px', 
            borderRadius: '4px',
            marginTop: '16px'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Monthly Cost Breakdown</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
              {costs.employerContribution > 0 && (
                <>
                  <div>Your Contribution:</div>
                  <div style={{ fontWeight: 500 }}>£{(costs.grossContribution - costs.employerContribution).toFixed(2)}</div>
                  
                  <div>Employer Adds:</div>
                  <div style={{ fontWeight: 500, color: '#3b82f6' }}>£{costs.employerContribution.toFixed(2)}</div>
                  
                  <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '8px' }}>Total to Pension:</div>
                  <div style={{ fontWeight: 600, borderTop: '1px solid #d1d5db', paddingTop: '8px' }}>
                    £{costs.grossContribution.toFixed(2)}
                  </div>
                  
                  <div style={{ marginTop: '8px' }}>Tax/NI Savings:</div>
                  <div style={{ fontWeight: 500, color: '#10b981', marginTop: '8px' }}>-£{costs.taxRelief.toFixed(2)}</div>
                  
                  <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '8px' }}>Your Net Cost:</div>
                  <div style={{ fontWeight: 600, borderTop: '1px solid #d1d5db', paddingTop: '8px', color: '#ef4444' }}>
                    £{costs.netCost.toFixed(2)}
                  </div>
                </>
              )}
              
              {costs.employerContribution === 0 && (
                <>
                  <div>Total to Pension:</div>
                  <div style={{ fontWeight: 600 }}>£{costs.grossContribution.toFixed(2)}</div>
                  
                  <div>HMRC Adds (20%):</div>
                  <div style={{ fontWeight: 500, color: '#10b981' }}>£{costs.taxRelief.toFixed(2)}</div>
                  
                  <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '8px' }}>Your Net Cost:</div>
                  <div style={{ fontWeight: 600, borderTop: '1px solid #d1d5db', paddingTop: '8px', color: '#ef4444' }}>
                    £{costs.netCost.toFixed(2)}
                  </div>
                </>
              )}
            </div>
            
            {selectedPlan.type === 'salary_sacrifice' && (
              <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                ⚡ Salary sacrifice provides additional NI savings (8%) compared to standard pension contributions
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#e5e7eb',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
