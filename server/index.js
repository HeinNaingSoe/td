// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { ObjectId } = require('mongodb');
const cors = require('cors');
const { connectToMongoDB } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to ensure MongoDB connection for each request
app.use(async (req, res, next) => {
  try {
    const { collection, rulesCollection, stringConversionCollection } = await connectToMongoDB();
    req.collection = collection;
    req.rulesCollection = rulesCollection;
    req.stringConversionCollection = stringConversionCollection;
    next();
  } catch (error) {
    console.error('MongoDB connection error in middleware:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await req.collection.find({}).toArray();
    // Ensure all users have required fields
    const normalizedUsers = users.map(user => ({
      _id: user._id,
      bets: user.bets || [],
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    }));
    res.json(normalizedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET - Get single user
app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await req.collection.findOne({ _id: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Ensure user has required fields
    const normalizedUser = {
      _id: user._id,
      bets: user.bets || [],
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    };
    res.json(normalizedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST - Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'User name is required' });
    }

    const userName = name.trim();
    const existing = await req.collection.findOne({ _id: userName });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const now = new Date().toISOString();
    const newUser = {
      _id: userName,
      bets: [],
      createdAt: now,
      updatedAt: now,
    };

    await req.collection.insertOne(newUser);
    res.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE - Delete user
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const result = await req.collection.deleteOne({ _id: req.params.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST - Add bets to user
app.post('/api/users/:userId/bets', async (req, res) => {
  try {
    const { bets } = req.body;
    if (!Array.isArray(bets)) {
      return res.status(400).json({ error: 'Bets must be an array' });
    }

    const user = await req.collection.findOne({ _id: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date().toISOString();
    const newBets = bets.map(bet => ({
      ...bet,
      date: bet.date || now,
      _id: new ObjectId().toString(),
    }));

    const updatedBets = [...user.bets, ...newBets];
    await req.collection.updateOne(
      { _id: req.params.userId },
      {
        $set: {
          bets: updatedBets,
          updatedAt: now,
        },
      }
    );

    res.json({ success: true, bets: updatedBets });
  } catch (error) {
    console.error('Error adding bets:', error);
    res.status(500).json({ error: 'Failed to add bets' });
  }
});

// PUT - Update bet
app.put('/api/users/:userId/bets/:betId', async (req, res) => {
  try {
    const { number, amount, message } = req.body;
    const user = await req.collection.findOne({ _id: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const betIndex = user.bets.findIndex(b => b._id === req.params.betId);
    if (betIndex === -1) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    user.bets[betIndex] = {
      ...user.bets[betIndex],
      number: number || user.bets[betIndex].number,
      amount: amount !== undefined ? amount : user.bets[betIndex].amount,
      message: message || user.bets[betIndex].message,
    };

    await req.collection.updateOne(
      { _id: req.params.userId },
      {
        $set: {
          bets: user.bets,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    res.json({ success: true, bet: user.bets[betIndex] });
  } catch (error) {
    console.error('Error updating bet:', error);
    res.status(500).json({ error: 'Failed to update bet' });
  }
});

// DELETE - Delete bet
app.delete('/api/users/:userId/bets/:betId', async (req, res) => {
  try {
    const user = await req.collection.findOne({ _id: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedBets = user.bets.filter(b => b._id !== req.params.betId);
    await req.collection.updateOne(
      { _id: req.params.userId },
      {
        $set: {
          bets: updatedBets,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    res.json({ success: true, bets: updatedBets });
  } catch (error) {
    console.error('Error deleting bet:', error);
    res.status(500).json({ error: 'Failed to delete bet' });
  }
});

// GET - Get summary (totals by user, with filters)
app.get('/api/summary', async (req, res) => {
  try {
    const { userId, startDate, endDate, event } = req.query;

    let query = {};
    if (userId && userId !== 'all') {
      query._id = userId;
    }

    const users = await req.collection.find(query).toArray();
    const now = new Date();
    
    // Set start date to beginning of day (00:00:00)
    let start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    
    // Set end date to end of day (23:59:59.999) to include all bets on that day
    let end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const summary = users.map(user => {
      const bets = user.bets || [];
      const filteredBets = bets.filter(bet => {
        if (!bet || !bet.date) return false;
        const betDate = new Date(bet.date);
        const dateMatch = betDate >= start && betDate <= end;
        
        // Filter by event if provided
        if (event && event !== 'all') {
          return dateMatch && bet.event === event;
        }
        
        return dateMatch;
      });

      const total = filteredBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
      const betCount = filteredBets.length;

      return {
        userId: user._id,
        total,
        betCount,
        bets: filteredBets,
      };
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});


// GET - Get all parsing rules
app.get('/api/parsing-rules', async (req, res) => {
  try {
    const rules = await req.rulesCollection.find({}).toArray();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching parsing rules:', error);
    res.status(500).json({ error: 'Failed to fetch parsing rules' });
  }
});

// POST - Create parsing rule
app.post('/api/parsing-rules', async (req, res) => {
  try {
    const { name, numbers } = req.body;
    if (!name || !numbers || !Array.isArray(numbers)) {
      return res.status(400).json({ error: 'Name and numbers array are required' });
    }

    const now = new Date().toISOString();
    const newRule = {
      name: name.trim(),
      numbers: numbers,
      createdAt: now,
      updatedAt: now,
    };

    const result = await req.rulesCollection.insertOne(newRule);
    const insertedRule = await req.rulesCollection.findOne({ _id: result.insertedId });
    res.json(insertedRule);
  } catch (error) {
    console.error('Error creating parsing rule:', error);
    res.status(500).json({ error: 'Failed to create parsing rule' });
  }
});

// PUT - Update parsing rule
app.put('/api/parsing-rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { name, numbers } = req.body;

    const updateData = {
      updatedAt: new Date().toISOString(),
    };
    if (name) updateData.name = name.trim();
    if (numbers && Array.isArray(numbers)) updateData.numbers = numbers;

    const result = await req.rulesCollection.updateOne(
      { _id: new ObjectId(ruleId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Parsing rule not found' });
    }

    const updatedRule = await req.rulesCollection.findOne({ _id: new ObjectId(ruleId) });
    res.json(updatedRule);
  } catch (error) {
    console.error('Error updating parsing rule:', error);
    res.status(500).json({ error: 'Failed to update parsing rule' });
  }
});

// DELETE - Delete parsing rule
app.delete('/api/parsing-rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const result = await req.rulesCollection.deleteOne({ _id: new ObjectId(ruleId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Parsing rule not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting parsing rule:', error);
    res.status(500).json({ error: 'Failed to delete parsing rule' });
  }
});

// GET - Get all string conversion rules
app.get('/api/string-conversion', async (req, res) => {
  try {
    const rules = await req.stringConversionCollection.find({}).toArray();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching string conversion rules:', error);
    res.status(500).json({ error: 'Failed to fetch string conversion rules' });
  }
});

// POST - Create string conversion rule
app.post('/api/string-conversion', async (req, res) => {
  try {
    const { from, to, enabled } = req.body;
    if (!from || from.trim() === '') {
      return res.status(400).json({ error: 'From string is required' });
    }

    const now = new Date().toISOString();
    const newRule = {
      from: from.trim(),
      to: to || '',
      enabled: enabled !== undefined ? enabled : true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await req.stringConversionCollection.insertOne(newRule);
    const insertedRule = await req.stringConversionCollection.findOne({ _id: result.insertedId });
    res.json(insertedRule);
  } catch (error) {
    console.error('Error creating string conversion rule:', error);
    res.status(500).json({ error: 'Failed to create string conversion rule' });
  }
});

// PUT - Update string conversion rule
app.put('/api/string-conversion/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { from, to, enabled } = req.body;

    const updateData = {
      updatedAt: new Date().toISOString(),
    };
    if (from !== undefined) updateData.from = from.trim();
    if (to !== undefined) updateData.to = to || '';
    if (enabled !== undefined) updateData.enabled = enabled;

    const result = await req.stringConversionCollection.updateOne(
      { _id: new ObjectId(ruleId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'String conversion rule not found' });
    }

    const updatedRule = await req.stringConversionCollection.findOne({ _id: new ObjectId(ruleId) });
    res.json(updatedRule);
  } catch (error) {
    console.error('Error updating string conversion rule:', error);
    res.status(500).json({ error: 'Failed to update string conversion rule' });
  }
});

// DELETE - Delete string conversion rule
app.delete('/api/string-conversion/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const result = await req.stringConversionCollection.deleteOne({ _id: new ObjectId(ruleId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'String conversion rule not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting string conversion rule:', error);
    res.status(500).json({ error: 'Failed to delete string conversion rule' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectToMongoDB();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.json({ status: 'ok', database: 'disconnected', error: error.message });
  }
});

// Catch-all route for undefined API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Catch-all for non-API routes (return JSON for API-like requests)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// Export app for Vercel serverless functions
module.exports = app;

// Start server only if running locally (not in Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  async function startServer() {
    try {
      await connectToMongoDB();
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  startServer();
}
