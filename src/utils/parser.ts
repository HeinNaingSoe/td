// Myanmar digit to ASCII mapping
const MYANMAR_DIGITS: Record<string, string> = {
  '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
  '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9',
};

/**
 * Clean text: remove space if not between two numbers, remove enter/tab,
 * convert Myanmar numbers to English, convert to lowercase.
 * Preserves spaces before and after numbers with 3+ continuous digits (amounts).
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

  // Preserve hyphens and spaces around numbers with 3+ digits (amounts)
  // First, mark hyphens and spaces around 3+ digit numbers with temporary markers
  const TEMP_MARKER = '___SPACE___';
  const TEMP_HYPHEN = '___HYPHEN___';
  
  // Mark hyphens before 3+ digits
  result = result.replace(/(-+)(\d{3,})/g, `${TEMP_HYPHEN}$2`);
  // Mark hyphens after 3+ digits
  result = result.replace(/(\d{3,})(-+)/g, `$1${TEMP_HYPHEN}`);
  // Mark spaces before 3+ digits
  result = result.replace(/(\s+)(\d{3,})/g, `${TEMP_MARKER}$2`);
  // Mark spaces after 3+ digits
  result = result.replace(/(\d{3,})(\s+)/g, `$1${TEMP_MARKER}`);

  // Remove spaces between two digits (2-digit numbers)
  result = result.replace(/(\d)\s+(\d)/g, '$1$2');

  // Remove all remaining spaces
  result = result.replace(/\s+/g, '');

  // Add hyphens before and after 3+ digit numbers that don't already have them
  result = result.replace(/(\d{3,})/g, (match, digits, offset, string) => {
    // Check if this number already has a hyphen marker before or after
    const beforeStart = Math.max(0, offset - TEMP_HYPHEN.length);
    const beforeText = string.substring(beforeStart, offset);
    const hasHyphenBefore = beforeText.includes(TEMP_HYPHEN);
    
    const afterStart = offset + match.length;
    const afterText = string.substring(afterStart, afterStart + TEMP_HYPHEN.length);
    const hasHyphenAfter = afterText.includes(TEMP_HYPHEN);
    
    let before = '';
    let after = '';
    
    // Add hyphen before if not already marked
    if (!hasHyphenBefore) {
      before = '-';
    }
    
    // Add hyphen after if not already marked
    if (!hasHyphenAfter) {
      after = '-';
    }
    
    return before + digits + after;
  });

  // Restore preserved spaces (replace marker with single space)
  result = result.replace(new RegExp(TEMP_MARKER, 'g'), ' ');
  // Restore preserved hyphens (replace marker with hyphen)
  result = result.replace(new RegExp(TEMP_HYPHEN, 'g'), '-');

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
 * Apply parsing rules: replace rule names with comma-separated numbers
 * e.g., if rule "1p" has numbers [10,11,12], replace "1p" with "10,11,12"
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
    
    // Replace rule name with comma-separated numbers
    const replacement = rule.numbers.join(',');
    result = result.replace(new RegExp(escapedRuleName, 'g'), replacement);
  }

  return result;
}

/**
 * Extract bet number and amount from cleaned text.
 * Logic:
 * - Pattern: "betNumbers-amount-" where betNumbers are comma-separated 2-digit numbers
 *   and amount is between hyphens (3+ digits)
 * - Example: "10,11,12,13-300-22,24,25-500-" 
 *   -> 10-300, 11-300, 12-300, 13-300, 22-500, 24-500, 25-500
 * - Extract numbers before "-amount-" as bet numbers
 * - Extract amount between hyphens after bet numbers
 */
export function extractBets(
  text: string,
  minAmount: number = 100
): Record<string, number> {
  const out: Record<string, number> = {};

  if (!text) return out;

  // Pattern: comma-separated bet numbers followed by -amount-
  // Example: "10,11,12,13-300-22,24,25-500-"
  // Split by pattern: -digits- (where digits are 3+)
  const amountPattern = /-(\d{3,})-/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = amountPattern.exec(text)) !== null) {
    const amount = parseInt(match[1], 10);
    if (isNaN(amount) || amount < minAmount) continue;

    // Get the text before this amount (from lastIndex to match.index)
    const beforeAmount = text.substring(lastIndex, match.index);
    
    // Extract all 2-digit numbers (bet numbers) from the text before the amount
    const betNumberMatches = beforeAmount.match(/\d{2}/g) || [];
    
    for (const betNumStr of betNumberMatches) {
      const betNum = parseInt(betNumStr, 10);
      if (!isNaN(betNum) && betNum >= 0 && betNum <= 99) {
        const key = betNum.toString().padStart(2, '0');
        out[key] = (out[key] || 0) + amount;
      }
    }

    // Update lastIndex to after the closing hyphen
    lastIndex = match.index + match[0].length;
  }

  // Handle any remaining text after the last amount
  // If there's text after the last "-amount-", check if it contains bet numbers
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    // If remaining text ends with "-amount-" pattern, process it
    const lastAmountMatch = remainingText.match(/-(\d{3,})-$/);
    if (lastAmountMatch) {
      const amount = parseInt(lastAmountMatch[1], 10);
      if (!isNaN(amount) && amount >= minAmount) {
        const beforeLastAmount = remainingText.substring(0, lastAmountMatch.index);
        const betNumberMatches = beforeLastAmount.match(/\d{2}/g) || [];
        
        for (const betNumStr of betNumberMatches) {
          const betNum = parseInt(betNumStr, 10);
          if (!isNaN(betNum) && betNum >= 0 && betNum <= 99) {
            const key = betNum.toString().padStart(2, '0');
            out[key] = (out[key] || 0) + amount;
          }
        }
      }
    }
  }

  return out;
}

/**
 * Step 4: Keep only digits, commas, and hyphens, remove all other characters
 */
export function keepOnlyDigitsCommasHyphens(text: string): string {
  if (!text) return '';
  // Keep only digits (0-9), commas, and hyphens
  return text.replace(/[^\d,\-]/g, '');
}

/**
 * Parse message with the new logic and return intermediate steps:
 * 1) Clean text (remove space if not between two numbers, enter, tab, Myanmar number to English, lower case)
 * 2) Convert strings based on string_conversion collection
 * 3) Convert the string based on parsing rules (replace rule names with numbers)
 * 4) Keep only digits, commas, and hyphens
 * 5) Extract bet number and amount
 * 
 * @param message - The original message to parse
 * @param rules - Parsing rules (rule name -> numbers array)
 * @param minAmount - Minimum bet amount
 * @param conversionRules - Optional string conversion rules to apply after cleaning
 * @returns Object with bets and intermediate preprocessing steps
 */
export function parseMessageWithRulesAndSteps(
  message: string,
  rules: { name: string; numbers: string[] }[],
  minAmount: number = 100,
  conversionRules?: { from: string; to: string; enabled: boolean }[],
): { bets: Record<string, number>; step1: string; step2: string; step3: string; step4: string } {
  if (!message) {
    return { bets: {}, step1: '', step2: '', step3: '', step4: '' };
  }

  // Step 1: Clean text
  let step1 = cleanText(message);

  // Step 2: Apply string conversion rules
  let step2 = step1;
  if (conversionRules && conversionRules.length > 0) {
    step2 = applyStringConversions(step1, conversionRules);
  }

  // Step 3: Apply parsing rules (replace rule names with their numbers)
  let step3 = step2;
  if (rules && rules.length > 0) {
    step3 = applyParsingRules(step2, rules);
  }

  // Step 4: Keep only digits, commas, and hyphens
  let step4 = keepOnlyDigitsCommasHyphens(step3);

  // Step 5: Extract bet number and amount
  const bets = extractBets(step4, minAmount);

  return { bets, step1, step2, step3, step4 };
}

/**
 * Parse message with the new logic:
 * 1) Clean text (remove space if not between two numbers, enter, tab, Myanmar number to English, lower case)
 * 2) Convert strings based on string_conversion collection
 * 3) Convert the string based on parsing rules (replace rule names with numbers)
 * 4) Keep only digits, commas, and hyphens
 * 5) Extract bet number and amount
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

  // Step 4: Keep only digits, commas, and hyphens
  cleaned = keepOnlyDigitsCommasHyphens(cleaned);

  // Step 5: Extract bet number and amount
  return extractBets(cleaned, minAmount);
}

/**
 * Generate all number columns (00-99)
 */
export function getNumberColumns(): string[] {
  return Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
}
