const username = localStorage.getItem("username");

async function loadActivity() {
  const response = await fetch("/api/activity");
  const activities = await response.json();

  const logContainer = document.getElementById("activityLog");
  logContainer.innerHTML = `<h2>Activity Log for ${username}</h2>`;

  const userActivities = activities.filter(act => act.username === username);
  if (userActivities.length === 0) {
    logContainer.innerHTML += "<p>No activities yet.</p>";
    return;
  }

  const ul = document.createElement("ul");
  userActivities.forEach(act => {
    const li = document.createElement("li");
    li.textContent = `${new Date(act.timestamp).toLocaleString()} — ${act.action}`;
    ul.appendChild(li);
  });

  logContainer.appendChild(ul);
}

loadActivity();

document.getElementById('addActivityBtn').addEventListener('click', async () => {
  const action = document.getElementById('newAction').value.trim();
  if (!action) return alert('Please enter an action.');

  const response = await fetch('/api/activity', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      username,
      timestamp: new Date().toISOString(),
      action
    })
  });

  if (response.ok) {
    alert('Activity added!');
    document.getElementById('newAction').value = '';
    loadActivity();  // reload activities to show the new one
  } else {
    alert('Failed to add activity.');
  }
});