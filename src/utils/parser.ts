// Myanmar digit to ASCII mapping
const MYANMAR_DIGITS: Record<string, string> = {
  '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
  '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9',
};

/**
 * Clean text: remove space if not between two numbers, remove enter/tab,
 * convert Myanmar numbers to English, convert to lowercase
 */
export function cleanText(text: string): string {
  if (!text) return '';

  let result = text;

  // Convert Myanmar digits to ASCII first
  for (const [myanmar, ascii] of Object.entries(MYANMAR_DIGITS)) {
    result = result.replace(new RegExp(myanmar, 'g'), ascii);
  }

  // Convert English letters to lowercase
  result = result.toLowerCase();

  // Remove tabs and newlines (enter)
  result = result.replace(/[\t\n\r]+/g, '');

  // Remove spaces that are NOT between two digits
  // Pattern: space that is not preceded by a digit OR not followed by a digit
  // We'll keep spaces between digits and remove all others
  result = result.replace(/(\d)\s+(\d)/g, '$1$2'); // Remove space between digits
  result = result.replace(/\s+/g, ''); // Remove all remaining spaces

  return result;
}

/**
 * Preprocess message: remove spaces/tabs/newlines, convert Myanmar numbers to English, lowercase English letters
 * (Legacy function - kept for backward compatibility)
 */
export function preprocessMessage(text: string): string {
  return cleanText(text);
}

/**
 * Apply string conversion rules to a message.
 * Rules are applied in order, and only enabled rules are used.
 */
export function applyStringConversions(
  text: string,
  conversionRules: { from: string; to: string; enabled: boolean }[]
): string {
  if (!text || !conversionRules || conversionRules.length === 0) {
    return text;
  }

  let result = text;

  // Apply enabled rules in order
  const enabledRules = conversionRules.filter(rule => rule.enabled && rule.from);
  for (const rule of enabledRules) {
    // Escape special regex characters in the "from" string
    const escapedFrom = rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use global replace to replace all occurrences
    result = result.replace(new RegExp(escapedFrom, 'g'), rule.to || '');
  }

  return result;
}

/**
 * Convert Myanmar digits to ASCII and normalize spacing
 * (Legacy function - kept for backward compatibility)
 */
export function toAsciiDigits(text: string): string {
  if (!text) return '';

  let result = text;
  // Replace Myanmar digits
  for (const [myanmar, ascii] of Object.entries(MYANMAR_DIGITS)) {
    result = result.replace(new RegExp(myanmar, 'g'), ascii);
  }
  // Replace Myanmar punctuation and normalize spaces
  result = result.replace(/[၊။\u104A\u104B]/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Extract number-amount pairs from message (e.g., '00 500', '19 200')
 * (legacy helper – still used in some places)
 */
export function parseMessage(message: string, minAmount: number = 100): Record<string, number> {
  const out: Record<string, number> = {};
  const text = toAsciiDigits(message || '');
  const tokens = text.match(/\d+/g) || [];

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.length >= 1 && tok.length <= 2) {
      const num = parseInt(tok, 10);
      i++;
      if (i < tokens.length) {
        const amtTok = tokens[i];
        if (amtTok.length >= 3 || parseInt(amtTok, 10) >= minAmount) {
          const amt = parseInt(amtTok, 10);
          if (num >= 0 && num <= 99 && amt >= minAmount) {
            const key = num.toString().padStart(2, '0');
            out[key] = (out[key] || 0) + amt;
          }
          i++;
        } else {
          i++;
        }
      }
    } else {
      i++;
    }
  }

  return out;
}

/**
 * Apply parsing rules: replace rule names with their numbers
 * e.g., if rule "၁ပတ်" has numbers [10,11,12], replace "၁ပတ်" with "101112"
 */
export function applyParsingRules(
  text: string,
  rules: { name: string; numbers: string[] }[]
): string {
  if (!text || !rules || rules.length === 0) {
    return text;
  }

  let result = text;

  // Apply rules in order
  for (const rule of rules) {
    if (!rule.name || !rule.numbers || rule.numbers.length === 0) continue;

    // Escape special regex characters in rule name
    const escapedRuleName = rule.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace rule name with concatenated numbers
    const replacement = rule.numbers.join('');
    result = result.replace(new RegExp(escapedRuleName, 'g'), replacement);
  }

  return result;
}

/**
 * Extract bet number and amount from cleaned text.
 * Logic:
 * - Two continuous numbers = bet number
 * - More than two continuous numbers = amount
 * - If comma exists: two numbers between commas = bet number, more than two numbers = amount
 * - If no comma: two numbers = bet number, more than two numbers = amount
 */
export function extractBets(
  text: string,
  minAmount: number = 100
): Record<string, number> {
  const out: Record<string, number> = {};

  if (!text) return out;

  // Check if text contains commas
  if (text.includes(',')) {
    // Pattern with commas: "00,100" or "00,100,200"
    // Two numbers between commas = bet number, more than two numbers = amount
    const segments = text.split(',');
    
    for (const segment of segments) {
      if (!segment) continue;
      
      // Find all number sequences in this segment
      const numberMatches = segment.match(/\d+/g) || [];
      
      for (let i = 0; i < numberMatches.length; i++) {
        const numStr = numberMatches[i];
        
        if (numStr.length === 2) {
          // Two digits = bet number
          const betNum = parseInt(numStr, 10);
          if (isNaN(betNum) || betNum < 0 || betNum > 99) continue;
          
          // Look for amount (more than 2 digits) after this bet number
          if (i + 1 < numberMatches.length) {
            const amtStr = numberMatches[i + 1];
            if (amtStr.length > 2) {
              const amt = parseInt(amtStr, 10);
              if (!isNaN(amt) && amt >= minAmount) {
                const key = betNum.toString().padStart(2, '0');
                out[key] = (out[key] || 0) + amt;
                i++; // Skip the amount
              }
            }
          }
        } else if (numStr.length > 2) {
          // More than 2 digits = amount (but we need a bet number first)
          // This shouldn't happen in comma-separated format, but handle it
          continue;
        }
      }
    }
  } else {
    // Pattern without commas: "00100" or "00100200"
    // Two numbers = bet number, more than two numbers = amount
    
    // First, handle continuous sequences like "00100" (bet "00", amount "100")
    // Pattern: exactly 2 digits followed by 3+ digits
    const continuousPattern = /(\d{2})(\d{3,})/g;
    let match: RegExpExecArray | null;
    const processedIndices = new Set<number>();
    
    while ((match = continuousPattern.exec(text)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      
      // Check if this range overlaps with already processed ranges
      let overlaps = false;
      for (let i = startIndex; i < endIndex; i++) {
        if (processedIndices.has(i)) {
          overlaps = true;
          break;
        }
      }
      
      if (overlaps) continue;
      
      const betNumStr = match[1];
      const amtStr = match[2];
      const betNum = parseInt(betNumStr, 10);
      const amt = parseInt(amtStr, 10);
      
      if (!isNaN(betNum) && !isNaN(amt) && betNum >= 0 && betNum <= 99 && amt >= minAmount) {
        const key = betNum.toString().padStart(2, '0');
        out[key] = (out[key] || 0) + amt;
        
        // Mark these indices as processed
        for (let i = startIndex; i < endIndex; i++) {
          processedIndices.add(i);
        }
      }
    }
    
    // Then, handle separate number sequences
    // Find all number sequences that weren't processed
    const allNumberMatches = text.match(/\d+/g) || [];
    let textIndex = 0;
    
    for (let i = 0; i < allNumberMatches.length; i++) {
      const numStr = allNumberMatches[i];
      const matchIndex = text.indexOf(numStr, textIndex);
      
      // Check if this number was already processed
      let wasProcessed = false;
      for (let j = matchIndex; j < matchIndex + numStr.length; j++) {
        if (processedIndices.has(j)) {
          wasProcessed = true;
          break;
        }
      }
      
      if (wasProcessed) {
        textIndex = matchIndex + numStr.length;
        continue;
      }
      
      if (numStr.length === 2) {
        // Two digits = bet number
        const betNum = parseInt(numStr, 10);
        if (isNaN(betNum) || betNum < 0 || betNum > 99) {
          textIndex = matchIndex + numStr.length;
          continue;
        }
        
        // Look for amount (more than 2 digits) immediately after
        if (i + 1 < allNumberMatches.length) {
          const nextNumStr = allNumberMatches[i + 1];
          const nextMatchIndex = text.indexOf(nextNumStr, matchIndex + numStr.length);
          
          // Check if next number is immediately after (no non-digit characters)
          const betweenText = text.substring(matchIndex + numStr.length, nextMatchIndex);
          if (betweenText.match(/^\D*$/) && nextNumStr.length > 2) {
            const amt = parseInt(nextNumStr, 10);
            if (!isNaN(amt) && amt >= minAmount) {
              const key = betNum.toString().padStart(2, '0');
              out[key] = (out[key] || 0) + amt;
              i++; // Skip the amount
              textIndex = nextMatchIndex + nextNumStr.length;
              continue;
            }
          }
        }
      }
      
      textIndex = matchIndex + numStr.length;
    }
  }

  return out;
}

/**
 * Parse message with the new logic:
 * 1) Clean text (remove space if not between two numbers, enter, tab, Myanmar number to English, lower case)
 * 2) Convert strings based on string_conversion collection
 * 3) Convert the string based on parsing rules (replace rule names with numbers)
 * 4) Extract bet number and amount
 * 
 * @param message - The original message to parse
 * @param rules - Parsing rules (rule name -> numbers array)
 * @param minAmount - Minimum bet amount
 * @param conversionRules - Optional string conversion rules to apply after cleaning
 */
export function parseMessageWithRules(
  message: string,
  rules: { name: string; numbers: string[] }[],
  minAmount: number = 100,
  conversionRules?: { from: string; to: string; enabled: boolean }[],
): Record<string, number> {
  if (!message) return {};

  // Step 1: Clean text
  let cleaned = cleanText(message);

  // Step 2: Apply string conversion rules
  if (conversionRules && conversionRules.length > 0) {
    cleaned = applyStringConversions(cleaned, conversionRules);
  }

  // Step 3: Apply parsing rules (replace rule names with their numbers)
  if (rules && rules.length > 0) {
    cleaned = applyParsingRules(cleaned, rules);
  }

  // Step 4: Extract bet number and amount
  return extractBets(cleaned, minAmount);
}

/**
 * Generate all number columns (00-99)
 */
export function getNumberColumns(): string[] {
  return Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
}
