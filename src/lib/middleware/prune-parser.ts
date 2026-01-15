import type { PruneSuggestion } from '../types';

/**
 * Parses prune suggestions from model response.
 * Extracts <prune_suggestions> XML block and returns clean response.
 */
export function parsePruneSuggestions(response: string): {
  cleanResponse: string;
  suggestions: PruneSuggestion[];
} {
  const regex = /<prune_suggestions>([\s\S]*?)<\/prune_suggestions>/;
  const match = response.match(regex);
  
  if (!match) {
    return { cleanResponse: response, suggestions: [] };
  }
  
  const cleanResponse = response.replace(regex, '').trim();
  const suggestions = parseSuggestionXml(match[1]);
  
  return { cleanResponse, suggestions };
}

/**
 * Parses individual suggestion elements from XML
 */
function parseSuggestionXml(xml: string): PruneSuggestion[] {
  const suggestions: PruneSuggestion[] = [];
  
  // Match: <suggestion id="msg:xxx" confidence="0.9" tokens="1234" reason="..." />
  const suggestionRegex = /<suggestion\s+id="([^"]+)"\s+confidence="([^"]+)"\s+tokens="([^"]+)"\s+reason="([^"]+)"\s*\/>/g;
  
  let match;
  while ((match = suggestionRegex.exec(xml)) !== null) {
    suggestions.push({
      id: match[1],
      confidence: parseFloat(match[2]),
      tokens: parseInt(match[3], 10),
      reason: match[4],
    });
  }
  
  return suggestions;
}

/**
 * Filters suggestions by confidence threshold
 */
export function filterByConfidence(
  suggestions: PruneSuggestion[],
  threshold: number
): PruneSuggestion[] {
  return suggestions.filter(s => s.confidence >= threshold);
}
