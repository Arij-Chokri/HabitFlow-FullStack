const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  streak: { type: Number, default: 0 },
  history: { type: [Number], default: [0, 0, 0, 0, 0, 0, 0] }
}, { timestamps: true });

module.exports = mongoose.model('Habit', HabitSchema);