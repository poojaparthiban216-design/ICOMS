console.log("Script.js loaded successfully!");

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username   = document.getElementById('username').value;
    const password   = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    // Clear any previous error
    messageDiv.classList.add('hidden');
    messageDiv.innerText = '';

    try {
        const response = await fetch('https://icoms.onrender.com/api/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });

        const data = await response.json();
        console.log("Server Response:", data);

        if (data.success) {
            // ── Save all user info to localStorage ───────────────
            localStorage.setItem('role',   data.role);
            localStorage.setItem('userId', data.user_id);
            localStorage.setItem('name',   data.name);   // ← BUG FIX: was missing before

            // ── Role-based redirect ───────────────────────────────
            const role = data.role.toLowerCase();
            if (role === 'admin')      window.location.href = 'admin.html';
            else if (role === 'supervisor')  window.location.href = 'supervisor.html';
            else if (role === 'dispatcher')  window.location.href = 'dispatcher.html';
            else if (role === 'driver')      window.location.href = 'driver.html';
            else if (role === 'client')      window.location.href = 'client-tracking.html';
            else window.location.href = role + '.html';

        } else {
            messageDiv.classList.remove('hidden');
            messageDiv.innerText = data.message || 'Login failed. Please try again.';
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        messageDiv.classList.remove('hidden');
        messageDiv.innerText = 'Cannot reach the server. Make sure node server.js is running.';
    }
});