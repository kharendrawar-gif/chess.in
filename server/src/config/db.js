import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.resolve('server/database.sqlite');
let db = null;

// Save SQLite database to disk file
export function persistDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[SQLite] Error persisting database to disk:', err);
  }
}

export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('[SQLite] Loaded existing database from:', DB_PATH);
    } catch (err) {
      console.warn('[SQLite] Failed to load existing file, creating new db:', err.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('[SQLite] Initialized new database.');
  }

  // Schema creation
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      elo INTEGER DEFAULT 1200,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      white_username TEXT NOT NULL,
      black_username TEXT NOT NULL,
      winner TEXT,
      end_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default demonstration bots if empty
  const countRes = db.exec('SELECT COUNT(*) as count FROM users');
  const userCount = countRes[0]?.values[0]?.[0] || 0;

  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('chess123', salt);

    const seedUsers = [
      ['MagnusBot', hash, 1850, 24, 2, 4],
      ['HikaruBot', hash, 1790, 20, 5, 3],
      ['KasparovBot', hash, 1720, 18, 6, 2],
      ['DeepBlue', hash, 1600, 15, 8, 5],
      ['NovicePlayer', hash, 1150, 3, 12, 1],
    ];

    seedUsers.forEach(([username, pass, elo, w, l, d]) => {
      db.run(
        'INSERT INTO users (username, password_hash, elo, wins, losses, draws) VALUES (?, ?, ?, ?, ?, ?)',
        [username, pass, elo, w, l, d]
      );
    });
    console.log('[SQLite] Seeded initial demonstration players for leaderboard.');
  }

  persistDatabase();
  return db;
}

// User operations
export function getUserByUsername(username) {
  if (!db) return null;
  const res = db.exec('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username]);
  if (!res || res.length === 0 || res[0].values.length === 0) return null;

  const cols = res[0].columns;
  const vals = res[0].values[0];
  const user = {};
  cols.forEach((col, idx) => {
    user[col] = vals[idx];
  });
  return user;
}

export function createUser(username, password) {
  if (!db) return null;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  try {
    db.run(
      'INSERT INTO users (username, password_hash, elo, wins, losses, draws) VALUES (?, ?, 1200, 0, 0, 0)',
      [username.trim(), passwordHash]
    );
    persistDatabase();
    return getUserByUsername(username);
  } catch (err) {
    console.error('Error creating user:', err);
    return null;
  }
}

export function getLeaderboard(limit = 15) {
  if (!db) return [];
  const res = db.exec(`
    SELECT username, elo, wins, losses, draws,
           (wins + losses + draws) as games_played,
           ROUND(CAST(wins AS FLOAT) / MAX(wins + losses + draws, 1) * 100, 1) as win_rate
    FROM users
    ORDER BY elo DESC, wins DESC
    LIMIT ?
  `, [limit]);

  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(vals => {
    const row = {};
    cols.forEach((c, idx) => (row[c] = vals[idx]));
    return row;
  });
}

// Elo Rating Calculation (Viva Formula)
export function calculateElo(whiteRating, blackRating, winner) {
  // Expected scores: E = 1 / (1 + 10^((opp - player) / 400))
  const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
  const expectedBlack = 1 / (1 + Math.pow(10, (whiteRating - blackRating) / 400));

  let actualWhite = 0.5;
  let actualBlack = 0.5;

  if (winner === 'w') {
    actualWhite = 1.0;
    actualBlack = 0.0;
  } else if (winner === 'b') {
    actualWhite = 0.0;
    actualBlack = 1.0;
  }

  const K = 32; // Standard Elo sensitivity factor
  const newWhite = Math.round(whiteRating + K * (actualWhite - expectedWhite));
  const newBlack = Math.round(blackRating + K * (actualBlack - expectedBlack));

  return {
    whiteEloDelta: newWhite - whiteRating,
    blackEloDelta: newBlack - blackRating,
    newWhiteElo: Math.max(100, newWhite),
    newBlackElo: Math.max(100, newBlack),
  };
}

// Update stats after a match
export function recordMatchResult(whiteName, blackName, winner, reason) {
  if (!db) return null;

  const whiteUser = getUserByUsername(whiteName);
  const blackUser = getUserByUsername(blackName);

  let eloChanges = null;

  if (whiteUser && blackUser) {
    eloChanges = calculateElo(whiteUser.elo, blackUser.elo, winner);

    // Update White stats
    const whiteWin = winner === 'w' ? 1 : 0;
    const whiteLoss = winner === 'b' ? 1 : 0;
    const whiteDraw = winner === null || winner === 'draw' ? 1 : 0;

    db.run(
      'UPDATE users SET elo = ?, wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE username = ? COLLATE NOCASE',
      [eloChanges.newWhiteElo, whiteWin, whiteLoss, whiteDraw, whiteName]
    );

    // Update Black stats
    const blackWin = winner === 'b' ? 1 : 0;
    const blackLoss = winner === 'w' ? 1 : 0;
    const blackDraw = winner === null || winner === 'draw' ? 1 : 0;

    db.run(
      'UPDATE users SET elo = ?, wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE username = ? COLLATE NOCASE',
      [eloChanges.newBlackElo, blackWin, blackLoss, blackDraw, blackName]
    );
  }

  // Record match history
  try {
    db.run(
      'INSERT INTO matches (white_username, black_username, winner, end_reason) VALUES (?, ?, ?, ?)',
      [whiteName, blackName, winner || 'draw', reason || 'finished']
    );
  } catch (err) {
    console.error('Error inserting match record:', err);
  }

  persistDatabase();
  return eloChanges;
}
