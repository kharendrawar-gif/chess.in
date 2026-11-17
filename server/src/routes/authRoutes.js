import express from 'express';
import bcrypt from 'bcryptjs';
import { getUserByUsername, createUser } from '../config/db.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Register new account
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || username.trim().length < 3 || username.trim().length > 16) {
    return res.status(400).json({ error: 'Username must be between 3 and 16 characters.' });
  }

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const existing = getUserByUsername(username.trim());
  if (existing) {
    return res.status(409).json({ error: 'Username is already taken.' });
  }

  const newUser = createUser(username.trim(), password);
  if (!newUser) {
    return res.status(500).json({ error: 'Failed to create user account.' });
  }

  const token = generateToken(newUser);
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      elo: newUser.elo,
      wins: newUser.wins,
      losses: newUser.losses,
      draws: newUser.draws,
    },
  });
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter username and password.' });
  }

  const user = getUserByUsername(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      elo: user.elo,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
    },
  });
});

// Current user profile
router.get('/me', authMiddleware, (req, res) => {
  const user = getUserByUsername(req.user.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      elo: user.elo,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
    },
  });
});

export default router;
