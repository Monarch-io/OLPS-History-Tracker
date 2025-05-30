document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem("username", data.username);
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("error").textContent = "Login failed!";
  }
});
