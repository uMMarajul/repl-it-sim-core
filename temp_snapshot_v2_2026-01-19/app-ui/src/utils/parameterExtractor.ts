/**
 * Parameter Extractor - Parse financial parameters from natural language
 * 
 * Extracts amounts, dates, durations, and percentages from user input
 */

export interface ExtractedParameters {
    amount?: number
    monthlyAmount?: number
    targetDate?: Date
    duration?: number  // in months
    percentage?: number
    purpose?: string
    raw?: { [key: string]: any }
}

/**
 * Extract monetary amounts from text
 * Handles: £50k, $100,000, 50000, £50,000, 15k, 2.5m
 */
export function extractAmount(text: string): number | undefined {
    // Match patterns like: £50k, $100,000, 50000, £50,000
    const patterns = [
        /[£$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*k/i,  // 50k, £50k
        /[£$]?\s*(\d+(?:\.\d+)?)\s*m(?:illion)?/i,    // 2.5m, £2million
        /[£$]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,        // £50,000, $100,000
        /(\d+(?:,\d{3})+(?:\.\d{2})?)/,                // 50,000
        /(\d{4,})/                                     // 50000
    ]

    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
            let value = parseFloat(match[1].replace(/,/g, ''))

            // Handle k (thousands)
            if (text.match(/k/i)) {
                value *= 1000
            }
            // Handle m (millions)
            if (text.match(/m(?:illion)?/i)) {
                value *= 1000000
            }

            return Math.round(value)
        }
    }

    return undefined
}

/**
 * Extract monthly amounts
 * Handles: £300/month, £300 per month, £300 monthly
 */
export function extractMonthlyAmount(text: string): number | undefined {
    const monthlyPattern = /[£$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per month|\/month|monthly|pm)/i
    const match = text.match(monthlyPattern)

    if (match) {
        return parseFloat(match[1].replace(/,/g, ''))
    }

    return undefined
}

/**
 * Extract duration in months
 * Handles: in 3 years, over 18 months, within 5 years
 */
export function extractDuration(text: string): number | undefined {
    // Years
    const yearPattern = /(?:in|over|within)\s+(\d+)\s+years?/i
    const yearMatch = text.match(yearPattern)
    if (yearMatch) {
        return parseInt(yearMatch[1]) * 12
    }

    // Months
    const monthPattern = /(?:in|over|within)\s+(\d+)\s+months?/i
    const monthMatch = text.match(monthPattern)
    if (monthMatch) {
        return parseInt(monthMatch[1])
    }

    return undefined
}

/**
 * Extract target date
 * Handles: by Dec 2025, by December 2025, by 2025-12-31
 */
export function extractTargetDate(text: string): Date | undefined {
    // Month Year format (by Dec 2025, by December 2025)
    const monthYearPattern = /by\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i
    const monthYearMatch = text.match(monthYearPattern)

    if (monthYearMatch) {
        const monthMap: { [key: string]: number } = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        }
        const month = monthMap[monthYearMatch[1].toLowerCase().substring(0, 3)]
        const year = parseInt(monthYearMatch[2])
        return new Date(year, month, 1)
    }

    // ISO date format (by 2025-12-31)
    const isoPattern = /by\s+(\d{4})-(\d{2})-(\d{2})/
    const isoMatch = text.match(isoPattern)
    if (isoMatch) {
        return new Date(
            parseInt(isoMatch[1]),
            parseInt(isoMatch[2]) - 1,
            parseInt(isoMatch[3])
        )
    }

    return undefined
}

/**
 * Extract percentage
 * Handles: 15%, 20 percent
 */
export function extractPercentage(text: string): number | undefined {
    const percentPattern = /(\d+(?:\.\d+)?)\s*(?:%|percent)/i
    const match = text.match(percentPattern)

    if (match) {
        return parseFloat(match[1])
    }

    return undefined
}

/**
 * Extract purpose/goal keywords
 */
export function extractPurpose(text: string): string | undefined {
    const purposes = [
        'house', 'home', 'property',
        'emergency', 'rainy day',
        'retirement', 'pension',
        'car', 'vehicle', 'boat',
        'wedding', 'marriage',
        'education', 'university', 'college',
        'debt', 'loan',
        'invest', 'investment', 'isa'
    ]

    const lowerText = text.toLowerCase()
    for (const purpose of purposes) {
        if (lowerText.includes(purpose)) {
            return purpose
        }
    }

    return undefined
}

/**
 * Main extraction function - extracts all parameters from text
 */
export function extractParameters(text: string): ExtractedParameters {
    return {
        amount: extractAmount(text),
        monthlyAmount: extractMonthlyAmount(text),
        targetDate: extractTargetDate(text),
        duration: extractDuration(text),
        percentage: extractPercentage(text),
        purpose: extractPurpose(text)
    }
}
