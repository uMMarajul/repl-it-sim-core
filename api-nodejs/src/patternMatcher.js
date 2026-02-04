/**
 * Pattern Matching Engine for Scenario Detection
 * 
 * Provides deterministic, maintainable keyword-based matching for all 55 scenarios.
 * Uses scenario_patterns.json as source of truth for keywords.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ScenarioPatternMatcher {
    constructor() {
        const patternsPath = path.join(__dirname, '../data/scenario_patterns.json');
        const patternsData = fs.readFileSync(patternsPath, 'utf-8');
        this.patterns = JSON.parse(patternsData);
        
        // Flatten for quick lookup
        this.scenarioMap = {};
        for (const [theme, scenarios] of Object.entries(this.patterns)) {
            for (const [scenarioId, config] of Object.entries(scenarios)) {
                this.scenarioMap[scenarioId] = {
                    theme: theme,
                    keywords: config.keywords,
                    params: config.params || []
                };
            }
        }
    }
    
    /**
     * Match text to a scenario using keyword patterns.
     * 
     * @param {string} text - User input or current message
     * @param {string[]} conversationHistory - List of previous user messages
     * @returns {[string, number]|null} - Tuple of [scenario_id, confidence_score] or null if no match
     */
    matchScenario(text, conversationHistory = null) {
        const textLower = text.toLowerCase();
        
        // Combine current text with recent history for context
        let searchText = textLower;
        if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-3);
            searchText = [...recentHistory, textLower].join(' ');
        }
        
        let bestMatch = null;
        let bestScore = 0.0;
        
        for (const [scenarioId, config] of Object.entries(this.scenarioMap)) {
            const score = this._calculateMatchScore(searchText, config.keywords);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = scenarioId;
            }
        }
        
        // Require minimum confidence threshold (adjusted for weighted scoring)
        if (bestScore >= 0.45) {
            return [bestMatch, bestScore];
        }
        
        return null;
    }
    
    /**
     * Calculate match score using weighted approach (industry best practice).
     * 
     * @param {string} text - Text to search in
     * @param {string[]} keywords - Keywords to match
     * @returns {number} - Float between 0.0 and 1.0 representing match confidence
     */
    _calculateMatchScore(text, keywords) {
        if (!keywords || keywords.length === 0) {
            return 0.0;
        }
        
        const matchedKeywords = [];
        
        for (const keyword of keywords) {
            // Use word boundaries for better matching
            const pattern = new RegExp(`\\b${this._escapeRegExp(keyword)}\\b`, 'i');
            if (pattern.test(text)) {
                matchedKeywords.push(keyword);
            }
        }
        
        if (matchedKeywords.length === 0) {
            return 0.0;
        }
        
        // WEIGHTED SCORING (Industry Standard)
        // Base score for any match
        let score = 0.5;
        
        // Bonus for exact phrase match (higher weight for precision)
        for (const keyword of matchedKeywords) {
            if (keyword.split(' ').length >= 2) { // Multi-word phrase
                score += 0.3;
                break;
            }
        }
        
        // Bonus for multiple keyword matches (higher confidence)
        if (matchedKeywords.length >= 2) {
            score += 0.2;
        }
        
        return Math.min(score, 1.0); // Cap at 1.0
    }
    
    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} - Escaped string
     */
    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Get expected parameters for a scenario.
     * @param {string} scenarioId - Scenario ID
     * @returns {string[]} - Array of parameter names
     */
    getScenarioParams(scenarioId) {
        return this.scenarioMap[scenarioId]?.params || [];
    }
    
    /**
     * Get the theme category for a scenario.
     * @param {string} scenarioId - Scenario ID
     * @returns {string|null} - Theme name or null
     */
    getScenarioTheme(scenarioId) {
        return this.scenarioMap[scenarioId]?.theme || null;
    }
    
    /**
     * Get all scenario IDs for a given theme.
     * @param {string} theme - Theme name
     * @returns {string[]} - Array of scenario IDs
     */
    getAllScenariosByTheme(theme) {
        return Object.entries(this.scenarioMap)
            .filter(([, config]) => config.theme === theme)
            .map(([scenarioId]) => scenarioId);
    }
    
    /**
     * Suggest related scenarios from the same theme.
     * 
     * Useful for multi-scenario recommendations (e.g., "having a baby" 
     * might suggest both childbirth and education_fund).
     * 
     * @param {string} scenarioId - Source scenario ID
     * @param {number} limit - Maximum number of suggestions
     * @returns {string[]} - Array of related scenario IDs
     */
    suggestRelatedScenarios(scenarioId, limit = 3) {
        const theme = this.getScenarioTheme(scenarioId);
        if (!theme) {
            return [];
        }
        
        const related = this.getAllScenariosByTheme(theme);
        
        // Return other scenarios from same theme
        return related.filter(s => s !== scenarioId).slice(0, limit);
    }
}

// Singleton instance
let _matcher = null;

/**
 * Get or create the global pattern matcher instance.
 * @returns {ScenarioPatternMatcher}
 */
function getMatcher() {
    if (_matcher === null) {
        _matcher = new ScenarioPatternMatcher();
    }
    return _matcher;
}

export { ScenarioPatternMatcher, getMatcher };
