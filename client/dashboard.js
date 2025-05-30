const username = localStorage.getItem("username");
const role = localStorage.getItem("role");

async function loadUsers() {
  if (role !== "admin") return;

  const response = await fetch("/api/users"); // Add this endpoint (see below)
  const users = await response.json();
  const dropdown = document.getElementById("targetUser");

  users.forEach(user => {
    const option = document.createElement("option");
    option.value = user.username;
    option.textContent = user.username;
    dropdown.appendChild(option);
  });

  dropdown.style.display = "block"; // Show dropdown for admins
}

async function loadActivity() {
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role"); // Store role during login

  const response = await fetch(`/api/activity?username=${username}&role=${role}`);
  const activities = await response.json();

  const logContainer = document.getElementById("activityLog");
  logContainer.innerHTML = `<h2>Activity Log (${role})</h2>`;

  if (activities.length === 0) {
    logContainer.innerHTML += "<p>No activities found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <tr>
      <th>User</th>
      <th>Timestamp</th>
      <th>Action</th>
      ${role === "admin" ? "<th>Actions</th>" : ""}
    </tr>
  `;

  activities.forEach((act, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${act.username}</td>
      <td>${new Date(act.timestamp).toLocaleString()}</td>
      <td>${act.action}</td>
      ${role === "admin" 
        ? `<td>
            <button onclick="editActivity(${index})">Edit</button>
            <button onclick="deleteActivity(${index})">Delete</button>
           </td>`
        : ""}
    `;
    table.appendChild(row);
  });

  logContainer.appendChild(table);
}

loadActivity();

async function deleteActivity(index) {
  if (confirm("Delete this activity?")) {
    await fetch(`/api/activity/${index}`, { method: "DELETE" });
    loadActivity(); // Refresh
  }
}

async function editActivity(index) {
  const newAction = prompt("Edit action text:");
  if (newAction) {
    await fetch(`/api/activity/${index}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: newAction })
    });
    loadActivity(); // Refresh
  }
}

document.getElementById('addActivityBtn').addEventListener('click', async () => {
  const action = document.getElementById('newAction').value.trim();
  if (!action) return alert('Please enter an action.');

  let targetUsername = localStorage.getItem("username"); // Default: current user
  
  // Override if admin selects another user
  if (role === "admin") {
    const selectedUser = document.getElementById('targetUser').value;
    if (selectedUser) targetUsername = selectedUser;
  }

  const response = await fetch('/api/activity', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      username: targetUsername, // Dynamic username
      timestamp: new Date().toISOString(),
      action
    })
  });

  if (response.ok) {
    alert('Activity added!');
    document.getElementById('newAction').value = '';
    loadActivity();
  } else {
    alert('Failed to add activity.');
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadActivity();
  loadUsers(); 
});