const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const auth = require('../middleware/auth'); // Imports our security guard middleware

// 🔓 All routes inside this file are protected by our auth middleware layer

// 1. GET ALL USER HABITS FOR THE LOGGED-IN ACCOUNT (/api/habits)
router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. CREATE NEW HABIT ROUTINE (/api/habits)
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Habit name is required.' });

    const newHabit = new Habit({
      userId: req.user.id,
      name,
      streak: 0,
      history: [0, 0, 0, 0, 0, 0, 0] // Fresh 7-day tracker row
    });

    const savedHabit = await newHabit.save();
    res.status(201).json(savedHabit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. TOGGLE HABIT HISTORY & STREAK SLOTS (/api/habits/:id)
router.put('/:id', auth, async (req, res) => {
  try {
    const { history, streak } = req.body;
    
    // ✅ FIXED: Correctly using req.params.id to fetch the specific habit document
    let habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit record not found.' });
    
    // Security Check: Verify that the habit belongs to the currently logged-in user
    if (habit.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Unauthorized action.' });
    }

    // Update the record in MongoDB Atlas
    habit = await Habit.findByIdAndUpdate(
      req.params.id,
      { $set: { history, streak } },
      { new: true } // Tells mongoose to return the newly updated version of the document
    );
    
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. REMOVE A HABIT COMPONENT (/api/habits/:id)
router.delete('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit record not found.' });
    
    // Security Check: Verify ownership before deleting
    if (habit.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Unauthorized action.' });
    }

    await habit.deleteOne();
    res.json({ message: 'Habit tracking item removed successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;