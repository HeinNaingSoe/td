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
 * - If NO commas: two continuous numbers = bet number, more than two continuous numbers = amount
 * - If commas exist: 
 *   - Pattern 1: "10,11,12,13500" or "10,11,12,13,500" - comma-separated bet numbers followed by amount
 *     Apply the amount to all comma-separated bet numbers (2 digits each)
 *   - Pattern 2: "00,100,11,500" - pairs of bet number, amount
 *     Two digits between commas = bet number, more than two digits = amount
 * Commas are preserved and used as delimiters.
 */
export function extractBets(
  text: string,
  minAmount: number = 100
): Record<string, number> {
  const out: Record<string, number> = {};

  if (!text) return out;

  // Check if text contains commas
  if (text.includes(',')) {
    const segments = text.split(',');
    
    // Detect pattern: comma-separated bet numbers (2 digits each) followed by a single amount
    // Example: "10,11,12,13,500" or "10,11,12,13500" -> apply 500 to 10, 11, 12, 13
    let betNumbers: number[] = [];
    let amount: number | null = null;
    
    // First pass: collect all 2-digit segments as bet numbers
    // Check if last segment contains both bet number and amount (e.g., "13500" = "13" + "500")
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].trim();
      if (!segment) continue;
      
      // Extract only digits from this segment
      const numberStr = segment.match(/\d+/)?.[0] || '';
      
      if (i === segments.length - 1 && numberStr.length > 2) {
        // Last segment with more than 2 digits: might contain bet number + amount
        // Try to split: first 2 digits = bet number, rest = amount
        const betNumStr = numberStr.substring(0, 2);
        const amtStr = numberStr.substring(2);
        
        const betNum = parseInt(betNumStr, 10);
        const amt = parseInt(amtStr, 10);
        
        if (!isNaN(betNum) && betNum >= 0 && betNum <= 99 && !isNaN(amt) && amt >= minAmount) {
          // Last segment contains both bet number and amount
          betNumbers.push(betNum);
          amount = amt;
          break;
        } else if (numberStr.length > 2 || parseInt(numberStr, 10) >= minAmount) {
          // Last segment is just an amount
          const amt = parseInt(numberStr, 10);
          if (!isNaN(amt) && amt >= minAmount) {
            amount = amt;
          }
        }
      } else if (numberStr.length === 2) {
        // Two digits = bet number
        const betNum = parseInt(numberStr, 10);
        if (!isNaN(betNum) && betNum >= 0 && betNum <= 99) {
          betNumbers.push(betNum);
        }
      } else if (numberStr.length > 2 || (numberStr.length > 0 && parseInt(numberStr, 10) >= minAmount)) {
        // More than 2 digits or >= minAmount = amount (standalone segment)
        const amt = parseInt(numberStr, 10);
        if (!isNaN(amt) && amt >= minAmount) {
          amount = amt;
          break; // Found the amount, stop collecting bet numbers
        }
      }
    }
    
    // If we found bet numbers and an amount, apply the amount to all bet numbers
    if (betNumbers.length > 0 && amount !== null) {
      for (const betNum of betNumbers) {
        const key = betNum.toString().padStart(2, '0');
        out[key] = (out[key] || 0) + amount;
      }
    } else {
      // Fallback: handle pair pattern "00,100,11,500" (bet number, amount pairs)
      for (let i = 0; i < segments.length; i += 2) {
        const betSegment = segments[i]?.trim();
        const amtSegment = segments[i + 1]?.trim();
        
        if (!betSegment || !amtSegment) continue;
        
        const betNumStr = betSegment.match(/\d+/)?.[0] || '';
        const amtStr = amtSegment.match(/\d+/)?.[0] || '';
        
        if (betNumStr.length === 2 && (amtStr.length > 2 || parseInt(amtStr, 10) >= minAmount)) {
          const betNum = parseInt(betNumStr, 10);
          const amt = parseInt(amtStr, 10);
          
          if (!isNaN(betNum) && !isNaN(amt) && betNum >= 0 && betNum <= 99 && amt >= minAmount) {
            const key = betNum.toString().padStart(2, '0');
            out[key] = (out[key] || 0) + amt;
          }
        }
      }
    }
  } else {
    // Pattern without commas: "00100" or "00100200"
    // Two continuous numbers = bet number, more than two continuous numbers = amount
    
    // Find all continuous number sequences
    const numberMatches = text.match(/\d+/g) || [];
    
    for (let i = 0; i < numberMatches.length; i++) {
      const numStr = numberMatches[i];
      
      if (numStr.length === 2) {
        // Two digits = bet number
        const betNum = parseInt(numStr, 10);
        if (isNaN(betNum) || betNum < 0 || betNum > 99) continue;
        
        // Look for amount (more than 2 digits) immediately after
        if (i + 1 < numberMatches.length) {
          const nextNumStr = numberMatches[i + 1];
          if (nextNumStr.length > 2) {
            const amt = parseInt(nextNumStr, 10);
            if (!isNaN(amt) && amt >= minAmount) {
              const key = betNum.toString().padStart(2, '0');
              out[key] = (out[key] || 0) + amt;
              i++; // Skip the amount
            }
          }
        }
      } else if (numStr.length > 2) {
        // More than 2 digits = amount (standalone, skip it as we need a bet number first)
        continue;
      }
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
