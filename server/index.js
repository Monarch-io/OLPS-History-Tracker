const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "client")));

const usersPath = path.join(__dirname, "..", "data", "users.json");
const activityPath = path.join(__dirname, "..", "data", "activity.json");

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, role: user.role, username: user.username });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.get("/api/users", (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
  res.json(users);
});

app.get("/api/activity", (req, res) => {
  const { username, role } = req.query; // Sent from frontend
  const activity = JSON.parse(fs.readFileSync(activityPath, "utf-8"));
  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  let filteredActivities;
  if (role === "admin") {
    filteredActivities = activity; // Admins see everything
  } else if (role === "teacher") {
    // Teachers see their activities + all students'
    filteredActivities = activity.filter(
      act => act.username === username || users.some(u => u.role === "student" && u.username === act.username)
    );
  } else {
    // Students/others see only their own
    filteredActivities = activity.filter(act => act.username === username);
  }

  res.json(filteredActivities);
});

app.post("/api/activity", (req, res) => {
  const { username, timestamp, action } = req.body;
  const newLog = { username, timestamp, action };
  const activity = JSON.parse(fs.readFileSync(activityPath, "utf-8"));
  activity.push(newLog);
  fs.writeFileSync(activityPath, JSON.stringify(activity, null, 2));
  res.json({ success: true });
});

app.delete("/api/activity/:id", (req, res) => {
  const { id } = req.params;
  let activity = JSON.parse(fs.readFileSync(activityPath, "utf-8"));
  activity = activity.filter((_, index) => index !== parseInt(id));
  fs.writeFileSync(activityPath, JSON.stringify(activity, null, 2));
  res.json({ success: true });
});

app.put("/api/activity/:id", (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  let activity = JSON.parse(fs.readFileSync(activityPath, "utf-8"));
  activity[parseInt(id)].action = action;
  fs.writeFileSync(activityPath, JSON.stringify(activity, null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});