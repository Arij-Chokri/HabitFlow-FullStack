const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Global Middleware Setup ---
app.use(cors());
app.use(express.json());

// --- Database Connection Pool ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🔌 Database cluster connection established successfully.'))
  .catch((err) => console.error('❌ Database connection fault detected:', err));

// --- API Routing Middlewares ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/tasks', require('./routes/tasks'));

// --- Base Health Check Route ---
app.get('/', (req, res) => {
  res.json({ message: 'HabitFlow REST API is live and operational.' });
});

// --- Initialize Server Listen Hook ---
app.listen(PORT, () => {
  console.log(`🚀 Server architecture executing on port ${PORT}`);
});