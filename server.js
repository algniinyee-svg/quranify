const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Fungsi baca/tulis database
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Gagal baca db.json:', err.message);
    return { users: {}, playlists: [], reciters: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// GET semua data
app.get('/api/data', (req, res) => {
  const db = readDB();
  res.json({
    playlists: db.playlists,
    reciters: db.reciters,
    user: db.users['default'] || null
  });
});

// GET user
app.get('/api/user/:id', (req, res) => {
  const db = readDB();
  const user = db.users[req.params.id] || {
    id: req.params.id,
    streak: 0,
    weeklyMinutes: 0,
    totalMinutes: 0,
    bookmarks: [],
    recentlyPlayed: [],
    favourites: []
  };
  res.json(user);
});

// POST progress mendengarkan
app.post('/api/user/:id/progress', (req, res) => {
  const db = readDB();
  const { surah, reciter, seconds } = req.body;
  
  if (!db.users[req.params.id]) {
    db.users[req.params.id] = {
      id: req.params.id,
      streak: 0,
      weeklyMinutes: 0,
      totalMinutes: 0,
      bookmarks: [],
      recentlyPlayed: [],
      favourites: []
    };
  }
  
  const user = db.users[req.params.id];
  const minutes = (seconds || 0) / 60;
  user.totalMinutes = (user.totalMinutes || 0) + minutes;
  user.weeklyMinutes = (user.weeklyMinutes || 0) + minutes;
  
  if (surah) {
    user.recentlyPlayed.unshift({ surah, reciter: reciter || 'mishary', timestamp: Date.now() });
    user.recentlyPlayed = user.recentlyPlayed.slice(0, 10);
  }
  
  writeDB(db);
  res.json(user);
});

// POST toggle bookmark
app.post('/api/user/:id/bookmark', (req, res) => {
  const db = readDB();
  const { surah, ayat } = req.body;
  
  if (!db.users[req.params.id]) {
    db.users[req.params.id] = {
      id: req.params.id,
      bookmarks: [],
      recentlyPlayed: [],
      favourites: []
    };
  }
  
  const user = db.users[req.params.id];
  const idx = user.bookmarks.findIndex(b => b.surah === surah && b.ayat === ayat);
  
  if (idx === -1) {
    user.bookmarks.push({ surah, ayat, timestamp: Date.now() });
  } else {
    user.bookmarks.splice(idx, 1);
  }
  
  writeDB(db);
  res.json(user);
});

// POST toggle favourite reciter
app.post('/api/user/:id/favourite', (req, res) => {
  const db = readDB();
  const { reciterId } = req.body;
  
  if (!db.users[req.params.id]) {
    db.users[req.params.id] = {
      id: req.params.id,
      bookmarks: [],
      recentlyPlayed: [],
      favourites: []
    };
  }
  
  const user = db.users[req.params.id];
  const idx = user.favourites.indexOf(reciterId);
  
  if (idx === -1) {
    user.favourites.push(reciterId);
  } else {
    user.favourites.splice(idx, 1);
  }
  
  writeDB(db);
  res.json(user);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server Quranify-clone berjalan di http://localhost:${PORT}`);
});
