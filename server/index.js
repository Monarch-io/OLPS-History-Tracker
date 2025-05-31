// index.js (updated)
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database"); // Import our SQLite database

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "client")));

// Login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  
  const user = db.prepare(`
    SELECT id, username, role FROM users 
    WHERE username = ? AND password = ?
  `).get(username, password);

  if (user) {
    res.json({ success: true, role: user.role, username: user.username });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Get all users (admin only)
app.get("/api/users", (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, 
           t.sections as teacher_sections, t.faculty as teacher_faculty,
           s.grade_level, s.section as student_section,
           a.sections as admin_sections, a.faculty as admin_faculty
    FROM users u
    LEFT JOIN teachers t ON u.id = t.user_id
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN admins a ON u.id = a.user_id
    ORDER BY u.username
  `).all();

  res.json(users);
});

// Get activities with role-based filtering
app.get("/api/activity", (req, res) => {
  const { username, role } = req.query;
  
  let query = `
    SELECT a.id, a.username, a.timestamp, a.action 
    FROM activities a
    JOIN users u ON a.user_id = u.id
  `;
  
  let params = [];
  
  if (role === 'admin') {
    // Admins see everything
    query += ' ORDER BY a.timestamp DESC';
  } else if (role === 'teacher') {
    // Teachers see their activities + all students' activities
    query += `
      WHERE (u.username = ? OR u.role = 'student')
      ORDER BY a.timestamp DESC
    `;
    params.push(username);
  } else {
    // Students see only their own activities
    query += ' WHERE u.username = ? ORDER BY a.timestamp DESC';
    params.push(username);
  }
  
  const activities = db.prepare(query).all(...params);
  res.json(activities);
});

app.post("/api/activity", (req, res) => {
  const { username, action } = req.body;
  
  try {
    // Store Philippines local time in YYYY-MM-DD HH:MM:SS format
    const now = new Date();
    const philippinesTime = now.toLocaleString('sv-SE', { 
      timeZone: 'Asia/Manila' 
    }).replace('T', ' ');
    
    const result = db.prepare(`
      INSERT INTO activities (user_id, username, timestamp, action)
      VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, ?)
    `).run(username, username, philippinesTime, action);
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid 
    });
  } catch (err) {
    console.error('Error adding activity:', err);
    res.status(400).json({ 
      success: false, 
      message: "Failed to add activity" 
    });
  }
});

// Delete activity (admin only)
app.delete("/api/activity/:id", (req, res) => {
  const { id } = req.params;
  
  const result = db.prepare(`
    DELETE FROM activities WHERE id = ?
  `).run(id);
  
  if (result.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Update activity (admin only)
app.put("/api/activity/:id", (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  
  const result = db.prepare(`
    UPDATE activities SET action = ? WHERE id = ?
  `).run(action, id);
  
  if (result.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.get("/api/debug/times", (req, res) => {
  const activities = db.prepare(`
    SELECT id, username, timestamp, action 
    FROM activities 
    ORDER BY timestamp DESC 
    LIMIT 5
  `).all();
  
  const debug = activities.map(act => {
    const date = new Date(act.timestamp);
    return {
      id: act.id,
      username: act.username,
      raw_timestamp: act.timestamp,
      utc_time: date.toISOString(),
      philippines_time: date.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      system_local: date.toLocaleString(),
      action: act.action
    };
  });
  
  res.json(debug);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});