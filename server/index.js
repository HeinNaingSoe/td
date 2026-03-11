const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://td_db_user:td00000000@cluster0.zhzkjdp.mongodb.net/';
const DB_NAME = 'td';
const COLLECTION_NAME = 'td1';

let db;
let collection;
let rulesCollection;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    rulesCollection = db.collection('parsing_rules');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// GET - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await collection.find({}).toArray();
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
    const user = await collection.findOne({ _id: req.params.userId });
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
    const existing = await collection.findOne({ _id: userName });
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

    await collection.insertOne(newUser);
    res.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE - Delete user
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const result = await collection.deleteOne({ _id: req.params.userId });
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

    const user = await collection.findOne({ _id: req.params.userId });
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
    await collection.updateOne(
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
    const user = await collection.findOne({ _id: req.params.userId });
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

    await collection.updateOne(
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
    const user = await collection.findOne({ _id: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedBets = user.bets.filter(b => b._id !== req.params.betId);
    await collection.updateOne(
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
    const { userId, startDate, endDate } = req.query;

    let query = {};
    if (userId && userId !== 'all') {
      query._id = userId;
    }

    const users = await collection.find(query).toArray();
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const summary = users.map(user => {
      const bets = user.bets || [];
      const filteredBets = bets.filter(bet => {
        if (!bet || !bet.date) return false;
        const betDate = new Date(bet.date);
        return betDate >= start && betDate <= end;
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
    const rules = await rulesCollection.find({}).toArray();
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

    const result = await rulesCollection.insertOne(newRule);
    const insertedRule = await rulesCollection.findOne({ _id: result.insertedId });
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

    const result = await rulesCollection.updateOne(
      { _id: new ObjectId(ruleId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Parsing rule not found' });
    }

    const updatedRule = await rulesCollection.findOne({ _id: new ObjectId(ruleId) });
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
    const result = await rulesCollection.deleteOne({ _id: new ObjectId(ruleId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Parsing rule not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting parsing rule:', error);
    res.status(500).json({ error: 'Failed to delete parsing rule' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: db ? 'connected' : 'disconnected' });
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

// Start server
async function startServer() {
  await connectToMongoDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
