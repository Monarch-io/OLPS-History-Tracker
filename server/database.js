// database.js
const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '..', 'data', 'olps.db');
const db = new Database(dbPath);

// Create tables
function initializeDatabase() {
  // Users table (replaces users.json)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Teachers table (additional teacher-specific data)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS teachers (
      user_id INTEGER PRIMARY KEY,
      sections TEXT,
      faculty TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Students table (additional student-specific data)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      user_id INTEGER PRIMARY KEY,
      grade_level TEXT,
      section TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Admins table (additional admin-specific data)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      user_id INTEGER PRIMARY KEY,
      sections TEXT,
      faculty TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Activities table (replaces activity.json)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      action TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Create indexes for better performance
  db.prepare('CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_activities_username ON activities(username)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)').run();
}

// Migrate data from JSON files to SQLite
function migrateData() {
  // Check if migration has already been done
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (usersCount > 0) return;

  const fs = require('fs');
  const usersPath = path.join(__dirname, '..', 'data', 'users.json');
  const activityPath = path.join(__dirname, '..', 'data', 'activity.json');

  // Migrate users
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  const insertTeacher = db.prepare('INSERT INTO teachers (user_id, sections, faculty) VALUES (?, ?, ?)');
  const insertStudent = db.prepare('INSERT INTO students (user_id, grade_level, section) VALUES (?, ?, ?)');
  const insertAdmin = db.prepare('INSERT INTO admins (user_id, sections, faculty) VALUES (?, ?, ?)');

  const transaction = db.transaction(() => {
    for (const user of users) {
      // Skip parent and officer roles as requested
      if (user.role === 'parent' || user.role === 'class_officer') continue;
      
      const info = insertUser.run(user.username, user.password, user.role);
      const userId = info.lastInsertRowid;
      
      // Add role-specific data with some default values
      if (user.role === 'teacher') {
        insertTeacher.run(userId, 'Section A, Section B', 'Faculty of Education');
      } else if (user.role === 'student') {
        insertStudent.run(userId, 'Grade 10', 'Section A');
      } else if (user.role === 'admin') {
        insertAdmin.run(userId, 'All Sections', 'Administration');
      }
    }
  });
  transaction();

  // Migrate activities
  const activities = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
  const insertActivity = db.prepare(`
    INSERT INTO activities (user_id, username, timestamp, action)
    VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, ?)
  `);

  const activityTransaction = db.transaction(() => {
    for (const activity of activities) {
      insertActivity.run(
        activity.username,
        activity.username,
        activity.timestamp,
        activity.action
      );
    }
  });
  activityTransaction();
}

// Initialize and migrate
initializeDatabase();
migrateData();

module.exports = db;