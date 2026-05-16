const express = require('express');
const router = express.Router();
const CalendarTask = require('../models/CalendarTask');
const auth = require('../middleware/auth');

// 1. GET ALL USER CALENDAR TASKS
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await CalendarTask.find({ userId: req.user.id });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. ADD TASK BOUND TO TIMELINE DATE INDEX
router.post('/', auth, async (req, res) => {
  try {
    const { date, text } = req.body; // Expects date format: "YYYY-MM-DD"
    if (!date || !text) return res.status(400).json({ message: 'Missing date or description field input.' });

    const newTask = new CalendarTask({
      userId: req.user.id,
      date,
      text,
      completed: false
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. TOGGLE TASK COMPLETION COMPLETION FLAG
router.put('/:id', auth, async (req, res) => {
  try {
    const { completed } = req.body;
    let task = await CalendarTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task item not found.' });
    if (task.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Unauthorized.' });

    task.completed = completed;
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. PURGE TASK FROM TIMELINE MAP
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await CalendarTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task item not found.' });
    if (task.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Unauthorized.' });

    await task.deleteOne();
    res.json({ message: 'Calendar entry cleared successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;