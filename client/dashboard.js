// dashboard.js (corrected)
const username = localStorage.getItem("username");
const role = localStorage.getItem("role");

function formatPhilippinesTime(timestamp) {
  const date = new Date(timestamp);
  
  // Check if the timestamp ends with 'Z' (UTC format from old JSON data)
  if (timestamp.endsWith('Z')) {
    // This is UTC time, add 8 hours for Philippines timezone
    const philippinesDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return philippinesDate.toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } else {
    // This is already local time (new entries), just format it
    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}

async function loadUsers() {
  if (role !== "admin") return;

  try {
    const response = await fetch("/api/users");
    const users = await response.json();
    const dropdown = document.getElementById("targetUser");

    // Clear existing options except the first one
    while (dropdown.options.length > 1) {
      dropdown.remove(1);
    }

    // Add users to dropdown
    users.forEach(user => {
      const option = document.createElement("option");
      option.value = user.username;
      option.textContent = user.username;
      dropdown.appendChild(option);
    });

    dropdown.style.display = "block";
  } catch (err) {
    console.error("Failed to load users:", err);
  }
}



async function loadActivity() {
  try {
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

    activities.forEach(act => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${act.username}</td>
        <td>${formatPhilippinesTime(act.timestamp)}</td>
        <td>${act.action}</td>
        ${role === "admin" 
          ? `<td>
              <button onclick="editActivity(${act.id})">Edit</button>
              <button onclick="deleteActivity(${act.id})">Delete</button>
             </td>`
          : ""}
      `;
      table.appendChild(row);
    });

    logContainer.appendChild(table);
  } catch (err) {
    console.error("Failed to load activities:", err);
    document.getElementById("activityLog").innerHTML = 
      `<h2>Activity Log</h2><p>Error loading activities. Please try again.</p>`;
  }
}

async function deleteActivity(id) {
  if (role !== "admin") return;
  
  if (confirm("Delete this activity?")) {
    try {
      const response = await fetch(`/api/activity/${id}`, { 
        method: "DELETE" 
      });
      
      if (response.ok) {
        loadActivity();
      } else {
        alert("Failed to delete activity.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting activity.");
    }
  }
}

function setupActivityDropdown() {
    const dropdown = document.getElementById('activityType');
    dropdown.innerHTML = '<option value="">-- Select Activity --</option>';
    
    // Common activities for all roles
    const commonActivities = [
        'Entered Campus',
        'Left Campus',
        'Entered Library',
        'Left Library',
        'Entered Clinic',
        'Left Clinic',
        'Bought Snack',
        'Bought Meal',
        'Bought Drink'
    ];
    
    // Admin-specific activities
    const adminActivities = [
        '1st Violation',
        '2nd Violation',
        '3rd Violation',
        'Meeting with Parents',
        'Suspension',
        'Expulsion'
    ];
    
    // Add common activities to all roles
    commonActivities.forEach(activity => {
        const option = document.createElement('option');
        option.value = activity;
        option.textContent = activity;
        dropdown.appendChild(option);
    });
    
    // Add admin-specific activities
    if (role === 'admin') {
        adminActivities.forEach(activity => {
            const option = document.createElement('option');
            option.value = activity;
            option.textContent = activity;
            dropdown.appendChild(option);
        });
    }
    
    // Show amount field for purchase activities
    dropdown.addEventListener('change', () => {
        const purchaseAmount = document.getElementById('purchaseAmount');
        const selected = dropdown.value;
        const isPurchase = selected.includes('Bought');
        
        purchaseAmount.style.display = isPurchase ? 'block' : 'none';
        if (isPurchase) {
            purchaseAmount.focus();
        }
    });
}

async function editActivity(id) {
  if (role !== "admin") return;
  
  const newAction = prompt("Edit action text:");
  if (newAction) {
    try {
      const response = await fetch(`/api/activity/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newAction })
      });
      
      if (response.ok) {
        loadActivity();
      } else {
        alert("Failed to update activity.");
      }
    } catch (err) {
      console.error("Edit error:", err);
      alert("Error updating activity.");
    }
  }
}

document.getElementById('addActivityBtn').addEventListener('click', async () => {
    const activityType = document.getElementById('activityType').value;
    const purchaseAmount = document.getElementById('purchaseAmount').value;
    
    if (!activityType) return alert('Please select an activity type.');
    
    let action = activityType;
    if (purchaseAmount && activityType.includes('Bought')) {
        action = `${activityType}: ₱${purchaseAmount}`;
    }
    
    let targetUsername = username; // Default: current user
    
    // Override if admin selects another user
    if (role === "admin") {
        const selectedUser = document.getElementById('targetUser').value;
        if (selectedUser) targetUsername = selectedUser;
    }

    try {
        const response = await fetch('/api/activity', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: targetUsername,
                action
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Activity added!');
            document.getElementById('activityType').value = '';
            document.getElementById('purchaseAmount').value = '';
            document.getElementById('purchaseAmount').style.display = 'none';
            loadActivity();
        } else {
            alert('Failed to add activity.');
        }
    } catch (err) {
        console.error("Add activity error:", err);
        alert('Error adding activity.');
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadActivity();
    loadUsers();
    setupActivityDropdown();
    
    // Update welcome message with username
    const welcomeMsg = document.querySelector('.welcome-message h2');
    if (welcomeMsg) {
        welcomeMsg.textContent = `Welcome, ${username} (${role})`;
    }
});