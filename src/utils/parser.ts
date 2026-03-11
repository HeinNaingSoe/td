// Myanmar digit to ASCII mapping
const MYANMAR_DIGITS: Record<string, string> = {
  '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
  '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9',
};

/**
 * Preprocess message: remove spaces/tabs/newlines, convert Myanmar numbers to English, lowercase English letters
 */
export function preprocessMessage(text: string): string {
  if (!text) return '';

  let result = text;

  // Convert Myanmar digits to ASCII
  for (const [myanmar, ascii] of Object.entries(MYANMAR_DIGITS)) {
    result = result.replace(new RegExp(myanmar, 'g'), ascii);
  }

  // Convert English letters to lowercase
  result = result.toLowerCase();

  // Remove spaces, tabs, and newlines (including all whitespace characters)
  result = result.replace(/\s+/g, '');

  return result;
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
 * Parse message with custom rules.
 * Each rule name in the message followed by an amount applies that amount to all numbers in the rule.
 * Also supports explicit pairs like "00 500" or "00500" (after preprocessing).
 * 
 * @param message - The original message to parse
 * @param rules - Parsing rules (rule name -> numbers array)
 * @param minAmount - Minimum bet amount
 * @param conversionRules - Optional string conversion rules to apply after preprocessing
 */
export function parseMessageWithRules(
  message: string,
  rules: { name: string; numbers: string[] }[],
  minAmount: number = 100,
  conversionRules?: { from: string; to: string; enabled: boolean }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  const originalMessage = message || '';

  // Preprocess: remove spaces/tabs/newlines, convert Myanmar numbers, lowercase letters
  let preprocessed = preprocessMessage(originalMessage);

  // Apply string conversion rules after preprocessing
  if (conversionRules && conversionRules.length > 0) {
    preprocessed = applyStringConversions(preprocessed, conversionRules);
  }

  // Also keep original for rule matching (rule names may contain Myanmar characters)
  const originalLower = originalMessage.toLowerCase();

  // 1) Apply rules: e.g., "၁ပတ် 200" or "၁ပတ်200" → all numbers in rule get 200 each
  // Match in original message (lowercased) to preserve Myanmar characters in rule names
  for (const rule of rules) {
    if (!rule.name || !rule.numbers || rule.numbers.length === 0) continue;

    // Escape special regex characters in rule name
    const escapedRuleName = rule.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match: ruleName followed by optional spaces/tabs/newlines, then amount
    // Pattern 1: with spaces (original format)
    const patternWithSpaces = new RegExp(`${escapedRuleName}\\s+([\\d၀၁၂၃၄၅၆၇၈၉]+)`, 'gi');
    // Pattern 2: without spaces (after preprocessing)
    const patternNoSpaces = new RegExp(`${escapedRuleName}([\\d၀၁၂၃၄၅၆၇၈၉]+)`, 'gi');

    let match: RegExpExecArray | null;

    // Try matching with spaces first
    while ((match = patternWithSpaces.exec(originalLower)) !== null) {
      const amtStr = preprocessMessage(match[1]); // Preprocess to get clean digits
      const amt = parseInt(amtStr, 10);
      if (isNaN(amt) || amt < minAmount) continue;

      for (const numStr of rule.numbers) {
        const key = numStr.toString().padStart(2, '0');
        out[key] = (out[key] || 0) + amt;
      }
    }

    // Try matching without spaces
    const preprocessedLower = preprocessed.toLowerCase();
    while ((match = patternNoSpaces.exec(preprocessedLower)) !== null) {
      const amtStr = match[1];
      const amt = parseInt(amtStr, 10);
      if (isNaN(amt) || amt < minAmount) continue;

      for (const numStr of rule.numbers) {
        const key = numStr.toString().padStart(2, '0');
        out[key] = (out[key] || 0) + amt;
      }
    }
  }

  // 2) Handle explicit pairs: e.g., "00 500", "19 200", or "00500", "19200"
  // Try pattern with spaces first (original format)
  const pairRegexWithSpaces = /(\d{1,2})\s+(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = pairRegexWithSpaces.exec(originalMessage)) !== null) {
    const numStr = m[1];
    const amtStr = m[2];
    const num = parseInt(numStr, 10);
    const amt = parseInt(amtStr, 10);
    if (isNaN(num) || isNaN(amt)) continue;
    if (num < 0 || num > 99 || amt < minAmount) continue;

    const key = num.toString().padStart(2, '0');
    out[key] = (out[key] || 0) + amt;
  }

  // Try pattern without spaces (preprocessed format)
  // Pattern: 1-2 digits (number) followed by 3+ digits (amount)
  // e.g., "00500" = number 00, amount 500
  // e.g., "19200" = number 19, amount 200
  const pairRegexNoSpaces = /(\d{1,2})(\d{3,})/g;
  while ((m = pairRegexNoSpaces.exec(preprocessed)) !== null) {
    const numStr = m[1];
    const amtStr = m[2];
    const num = parseInt(numStr, 10);
    const amt = parseInt(amtStr, 10);
    if (isNaN(num) || isNaN(amt)) continue;
    if (num < 0 || num > 99 || amt < minAmount) continue;

    const key = num.toString().padStart(2, '0');
    // Only add if not already set by a rule (or add to existing)
    out[key] = (out[key] || 0) + amt;
  }

  return out;
}

/**
 * Generate all number columns (00-99)
 */
export function getNumberColumns(): string[] {
  return Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
}
