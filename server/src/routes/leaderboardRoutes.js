import express from 'express';
import { getLeaderboard } from '../config/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 15;
    const leaders = getLeaderboard(limit);
    res.json(leaders);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
  }
});

export default router;
