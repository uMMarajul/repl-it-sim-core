"""
Pattern Matching Engine for Scenario Detection

Provides deterministic, maintainable keyword-based matching for all 55 scenarios.
Uses scenario_patterns.json as source of truth for keywords.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Load pattern library
PATTERNS_FILE = Path(__file__).parent / 'scenario_patterns.json'

class ScenarioPatternMatcher:
    def __init__(self):
        with open(PATTERNS_FILE, 'r', encoding='utf-8') as f:
            self.patterns = json.load(f)
        
        # Flatten for quick lookup
        self.scenario_map = {}
        for theme, scenarios in self.patterns.items():
            for scenario_id, config in scenarios.items():
                self.scenario_map[scenario_id] = {
                    'theme': theme,
                    'keywords': config['keywords'],
                    'params': config.get('params', [])
                }
    
    def match_scenario(self, text: str, conversation_history: List[str] = None) -> Optional[Tuple[str, float]]:
        """
        Match text to a scenario using keyword patterns.
        
        Args:
            text: User input or current message
            conversation_history: List of previous user messages
            
        Returns:
            Tuple of (scenario_id, confidence_score) or None if no match
        """
        text_lower = text.lower()
        
        # Combine current text with recent history for context
        search_text = text_lower
        if conversation_history:
            search_text = ' '.join(conversation_history[-3:] + [text_lower])
        
        best_match = None
        best_score = 0.0
        
        for scenario_id, config in self.scenario_map.items():
            score = self._calculate_match_score(search_text, config['keywords'])
            
            if score > best_score:
                best_score = score
                best_match = scenario_id
        
        # Require minimum confidence threshold (adjusted for weighted scoring)
        if best_score >= 0.45:  # Minimum 0.5 base score - small margin
            return (best_match, best_score)
        
        return None
    
    def _calculate_match_score(self, text: str, keywords: List[str]) -> float:
        """
        Calculate match score using weighted approach (industry best practice).
        
        Returns:
            Float between 0.0 and 1.0 representing match confidence
        """
        if not keywords:
            return 0.0
        
        matched_keywords = []
        
        for keyword in keywords:
            # Use word boundaries for better matching
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                matched_keywords.append(keyword)
        
        if not matched_keywords:
            return 0.0
        
        # WEIGHTED SCORING (Industry Standard)
        # Base score for any match
        score = 0.5
        
        # Bonus for exact phrase match (higher weight for precision)
        for keyword in matched_keywords:
            if len(keyword.split()) >= 2:  # Multi-word phrase
                score += 0.3
                break
        
        # Bonus for multiple keyword matches (higher confidence)
        if len(matched_keywords) >= 2:
            score += 0.2
        
        return min(score, 1.0)  # Cap at 1.0
    
    def get_scenario_params(self, scenario_id: str) -> List[str]:
        """Get expected parameters for a scenario."""
        return self.scenario_map.get(scenario_id, {}).get('params', [])
    
    def get_scenario_theme(self, scenario_id: str) -> Optional[str]:
        """Get the theme category for a scenario."""
        return self.scenario_map.get(scenario_id, {}).get('theme')
    
    def get_all_scenarios_by_theme(self, theme: str) -> List[str]:
        """Get all scenario IDs for a given theme."""
        return [
            scenario_id 
            for scenario_id, config in self.scenario_map.items()
            if config['theme'] == theme
        ]
    
    def suggest_related_scenarios(self, scenario_id: str, limit: int = 3) -> List[str]:
        """
        Suggest related scenarios from the same theme.
        
        Useful for multi-scenario recommendations (e.g., "having a baby" 
        might suggest both childbirth and education_fund).
        """
        theme = self.get_scenario_theme(scenario_id)
        if not theme:
            return []
        
        related = self.get_all_scenarios_by_theme(theme)
        
        # Return other scenarios from same theme
        return [s for s in related if s != scenario_id][:limit]


# Singleton instance
_matcher = None

def get_matcher() -> ScenarioPatternMatcher:
    """Get or create the global pattern matcher instance."""
    global _matcher
    if _matcher is None:
        _matcher = ScenarioPatternMatcher()
    return _matcher
