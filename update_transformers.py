
import os
import re

FILE_PATH = "c:/Users/harri/Downloads/replit-sim-core/replit-sim-core/app-ui/src/config/configTransformers.ts"

NEW_FUNCTION_BODY = r"""function transformCustomGoal(data: Record<string, any>): ScenarioModifier[] {
  const scenarioName = data.scenarioName || 'Custom Goal'
  const direction = data.direction || 'save' // 'save' | 'spend' | 'income' | 'debt' | 'withdraw'
  const frequency = data.frequency || 'lump_sum' // 'lump_sum' | 'monthly' | 'both'
  const targetDate = ensureDate(data.targetDate)

  // Generate a unique suffix to prevent collisions if multiple goals have same name
  const uniqueId = Math.floor(Math.random() * 1000000).toString()

  const modifiers: ScenarioModifier[] = []

  // 1. Lump Sum Component
  if (frequency === 'lump_sum' || frequency === 'both') {
    const amount = ensureNumber(data.targetAmount, 0)
    if (amount > 0) {
      if (direction === 'save') {
        modifiers.push({
          id: `goal-${scenarioName}-lump-${uniqueId}`,
          name: `${scenarioName} (Target)`,
          scenarioId: 'custom_goal',
          archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_CONTRIBUTION,
          targetAmount: amount,
          targetDate: targetDate,
          startDate: targetDate, 
          assumptions: { note: 'Custom Savings Goal (Lump Sum)' }
        })
      } else if (direction === 'spend') {
        modifiers.push({
           id: `goal-${scenarioName}-expense-${uniqueId}`,
           name: `${scenarioName} (Expense)`,
           scenarioId: 'custom_goal',
           archetype: ScenarioArchetype.ONE_OFF_EXPENSE,
           targetAmount: amount,
           targetDate: targetDate,
           startDate: targetDate,
           assumptions: { note: 'Custom Expense (Lump Sum)' }
        })
      } else if (direction === 'income') {
        modifiers.push({
           id: `goal-${scenarioName}-inflow-${uniqueId}`,
           name: `${scenarioName} (Inflow)`,
           scenarioId: 'custom_goal',
           archetype: ScenarioArchetype.ONE_OFF_INFLOW,
           targetAmount: amount,
           targetDate: targetDate,
           startDate: targetDate,
           assumptions: { note: 'Custom Inflow (Lump Sum)' }
        })
      } else if (direction === 'debt') {
         modifiers.push({
           id: `goal-${scenarioName}-debt-${uniqueId}`,
           name: `${scenarioName} (New Debt)`,
           scenarioId: 'custom_goal',
           archetype: ScenarioArchetype.NEW_DEBT,
           targetAmount: amount, 
           targetDate: targetDate, 
           startDate: targetDate,
           interestRate: 0.05, 
           termYears: 10,
           monthlyRepayment: 0,
           assumptions: { note: 'Custom Debt (Lump Sum Principal)' }
         })
      } else if (direction === 'withdraw') {
        modifiers.push({
           id: `goal-${scenarioName}-withdraw-${uniqueId}`,
           name: `${scenarioName} (Withdrawal)`,
           scenarioId: 'custom_goal',
           archetype: ScenarioArchetype.ONE_OFF_ACCOUNT_WITHDRAWAL,
           targetAmount: amount,
           targetDate: targetDate,
           startDate: targetDate,
           linkedAccountName: data.sourceAccountId || undefined,
           assumptions: { note: 'Custom Withdrawal' }
        })
      }
    }
  }

  // 2. Monthly Component
  if (frequency === 'monthly' || frequency === 'both') {
    const monthlyAmt = ensureNumber(data.monthlyAmount, 0)
    if (monthlyAmt > 0) {
      // Duration Calculation
      const now = new Date()
      // Assume start date is NOW.
      const start = new Date()
      const end = targetDate
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
      if (months < 1) months = 12 
      const durationYears = months / 12
      
      if (direction === 'save') {
        modifiers.push({
          id: `goal-${scenarioName}-monthly-${uniqueId}`,
          name: `${scenarioName} (Monthly)`,
          scenarioId: 'custom_goal',
          archetype: ScenarioArchetype.RECURRING_ACCOUNT_CONTRIBUTION,
          targetAmount: 0,
          monthlyContribution: monthlyAmt,
          startDate: start,
          targetDate: end,
          duration: durationYears,
          frequency: 'monthly' as const,
          assumptions: { note: 'Custom Monthly Savings' }
        })
      } else if (direction === 'spend') {
        modifiers.push({
          id: `goal-${scenarioName}-recurring-${uniqueId}`,
          name: `${scenarioName} (Monthly Cost)`,
          scenarioId: 'custom_goal',
          archetype: ScenarioArchetype.RECURRING_EXPENSE,
          targetAmount: 0,
          monthlyContribution: monthlyAmt,
          startDate: start,
          targetDate: end,
          duration: durationYears,
          frequency: 'monthly' as const,
          assumptions: { note: 'Custom Monthly Expense' }
        })
      } else if (direction === 'income') {
        modifiers.push({
          id: `goal-${scenarioName}-recurring-income-${uniqueId}`,
          name: `${scenarioName} (Monthly Income)`,
          scenarioId: 'custom_goal',
          archetype: ScenarioArchetype.RECURRING_INCOME,
          targetAmount: 0,
          monthlyContribution: monthlyAmt,
          startDate: start,
          targetDate: end,
          duration: durationYears,
          frequency: 'monthly' as const,
          assumptions: { note: 'Custom Monthly Income' }
        })
      } else if (direction === 'withdraw') {
        modifiers.push({
          id: `goal-${scenarioName}-recurring-withdrawal-${uniqueId}`,
          name: `${scenarioName} (Monthly Withdrawal)`,
          scenarioId: 'custom_goal',
          archetype: ScenarioArchetype.RECURRING_ACCOUNT_WITHDRAWAL,
          targetAmount: 0,
          monthlyContribution: monthlyAmt,
          startDate: start,
          targetDate: end,
          duration: durationYears,
          linkedAccountName: data.sourceAccountId || undefined,
          frequency: 'monthly' as const,
          assumptions: { note: 'Custom Monthly Withdrawal' }
        })
      } else if (direction === 'debt') {
        modifiers.push({
          id: `goal-${scenarioName}-debt-payment-${uniqueId}`,
          name: `${scenarioName} (Debt Payment)`,
          scenarioId: 'custom_goal',
          archetype: ScenarioArchetype.RECURRING_EXPENSE,
          targetAmount: 0,
          monthlyContribution: monthlyAmt,
          startDate: start,
          targetDate: end,
          duration: durationYears,
          frequency: 'monthly' as const,
          assumptions: { note: 'Custom Debt Repayment' }
        })
      }
    }
  }

  return modifiers
}"""

def main():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()

        # Regex to find the function
        # Matches "function transformCustomGoal(....) { ... }" including nested braces?
        # A simple non-greedy match until the start of the Next Function "function transformWeddingFund" seems safer given the structure.
        
        pattern = r"(function transformCustomGoal\(.*?\): ScenarioModifier\[\] \{)(.*?)(^\}\s*^function transformWeddingFund)"
        
        # NOTE: '.' does not match newlines by default without DOTALL.
        # But we can use (?s) flag.
        # Also, constructing regex for big blocks is risky.
        
        # Better: String split.
        parts = content.split("function transformCustomGoal(data: Record<string, any>): ScenarioModifier[] {")
        if len(parts) < 2:
            print("Could not find function start")
            return

        preamble = parts[0]
        remainder = parts[1]
        
        # Find the end of the function.
        # We know it ends before "function transformWeddingFund"
        # ViewFile 3036: line 907 starts transformWeddingFund.
        
        subparts = remainder.split("function transformWeddingFund")
        if len(subparts) < 2:
            print("Could not find function end (transformWeddingFund)")
            return
            
        post_function = "function transformWeddingFund" + subparts[1]
        
        # Reassemble
        new_content = preamble + NEW_FUNCTION_BODY + "\n\n" + post_function
        
        # Wait, ignoring 'subparts[0]'? Yes, that is the OLD body we are replacing.
        
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
        print("Successfully updated configTransformers.ts")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
