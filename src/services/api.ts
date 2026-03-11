import { User, Bet, ParsedBet, ParsingRule, SummaryItem } from '../types';

// Use relative URL in production (Vercel), absolute URL in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// Helper function to check if response is JSON
async function parseJSONResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response. Make sure the backend server is running on ${API_BASE_URL}. Response: ${text.substring(0, 100)}`);
  }
  return response.json();
}

// Users
export async function getUsers(): Promise<User[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) {
      const error = await parseJSONResponse(response).catch(() => {
        throw new Error(`Failed to fetch users. Server returned status ${response.status}. Make sure the backend server is running on ${API_BASE_URL}`);
      });
      throw new Error(error.error || 'Failed to fetch users');
    }
    return parseJSONResponse(response);
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please make sure the server is running.`);
    }
    throw error;
  }
}

export async function getUser(userId: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

export async function createUser(name: string): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const error = await parseJSONResponse(response).catch(() => {
        throw new Error(`Failed to create user. Server returned status ${response.status}`);
      });
      throw new Error(error.error || 'Failed to create user');
    }
    return parseJSONResponse(response);
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server. Please make sure the server is running.`);
    }
    throw error;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
}

// Bets
export async function addBetsToUser(userId: string, bets: ParsedBet[]): Promise<Bet[]> {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}/bets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bets }),
  });
  if (!response.ok) {
    throw new Error('Failed to add bets');
  }
  const result = await response.json();
  return result.bets;
}

export async function updateBet(userId: string, betId: string, bet: Partial<ParsedBet>): Promise<Bet> {
  const response = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(userId)}/bets/${betId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bet),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to update bet');
  }
  const result = await response.json();
  return result.bet;
}

export async function deleteBet(userId: string, betId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(userId)}/bets/${betId}`,
    {
      method: 'DELETE',
    }
  );
  if (!response.ok) {
    throw new Error('Failed to delete bet');
  }
}

// Summary
export async function getSummary(
  userId?: string,
  startDate?: string,
  endDate?: string
): Promise<SummaryItem[]> {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`${API_BASE_URL}/summary?${params.toString()}`);
    if (!response.ok) {
      const error = await parseJSONResponse(response).catch(() => {
        throw new Error(`Failed to fetch summary. Server returned status ${response.status}`);
      });
      throw new Error(error.error || 'Failed to fetch summary');
    }
    return parseJSONResponse(response);
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server. Please make sure the server is running.`);
    }
    throw error;
  }
}

// Parsing Rules
export async function getParsingRules(): Promise<ParsingRule[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/parsing-rules`);
    if (!response.ok) {
      const error = await parseJSONResponse(response).catch(() => {
        throw new Error(`Failed to fetch parsing rules. Server returned status ${response.status}`);
      });
      throw new Error(error.error || 'Failed to fetch parsing rules');
    }
    return parseJSONResponse(response);
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server. Please make sure the server is running.`);
    }
    throw error;
  }
}

export async function createParsingRule(rule: Omit<ParsingRule, '_id' | 'createdAt' | 'updatedAt'>): Promise<ParsingRule> {
  try {
    const response = await fetch(`${API_BASE_URL}/parsing-rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
    });
    if (!response.ok) {
      const error = await parseJSONResponse(response).catch(() => {
        throw new Error(`Failed to create parsing rule. Server returned status ${response.status}`);
      });
      throw new Error(error.error || 'Failed to create parsing rule');
    }
    return parseJSONResponse(response);
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server. Please make sure the server is running.`);
    }
    throw error;
  }
}

export async function updateParsingRule(ruleId: string, rule: Partial<ParsingRule>): Promise<ParsingRule> {
  try {
    const response = await fetch(`${API_BASE_URL}/parsing-rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
    });
    if (!response.ok) {
      const error = await parseJSONResponse(response).catch(() => {
        throw new Error(`Failed to update parsing rule. Server returned status ${response.status}`);
      });
      throw new Error(error.error || 'Failed to update parsing rule');
    }
    return parseJSONResponse(response);
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server. Please make sure the server is running.`);
    }
    throw error;
  }
}

export async function deleteParsingRule(ruleId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/parsing-rules/${ruleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await parseJSONResponse(response).catch(() => {
        throw new Error(`Failed to delete parsing rule. Server returned status ${response.status}`);
      });
      throw new Error(error.error || 'Failed to delete parsing rule');
    }
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server. Please make sure the server is running.`);
    }
    throw error;
  }
}
