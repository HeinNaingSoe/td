export interface Bet {
  number: string; // 00-99
  amount: number;
  date: string; // ISO date string
  message: string; // Original message
  _id?: string; // MongoDB _id for the bet
}

export interface User {
  _id: string; // User name as _id
  bets?: Bet[]; // Optional in case it's not initialized
  createdAt?: string;
  updatedAt?: string;
}

export interface ParsedBet {
  number: string;
  amount: number;
  message: string;
}

export interface ParsingRule {
  _id?: string; // MongoDB _id
  name: string; // Rule name (e.g., "၁ပတ်")
  numbers: string[]; // Array of numbers (e.g., ["10", "11", "12", ...])
  createdAt?: string;
  updatedAt?: string;
}

export interface SummaryItem {
  userId: string;
  total: number;
  betCount: number;
  bets: Bet[];
}
