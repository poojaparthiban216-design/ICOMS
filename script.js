console.log("Script.js loaded successfully!");

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
<<<<<<< HEAD
    
    // TEST 1: If this box doesn't show, the script isn't linked to the form
    alert("Button Clicked! Attempting to connect to server...");

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
=======

    const username   = document.getElementById('username').value;
    const password   = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');

    // Clear any previous error
    messageDiv.classList.add('hidden');
    messageDiv.innerText = '';

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
>>>>>>> 3759db80d9a693123a2bb4d4189b35c4968481f7
        });

        const data = await response.json();
        console.log("Server Response:", data);

        if (data.success) {
<<<<<<< HEAD
            alert("Login Successful! Redirecting to " + data.role);
            localStorage.setItem('role', data.role);
            localStorage.setItem('userId', data.user_id);
            
            // Redirect
            window.location.href = data.role.toLowerCase() + ".html";
        } else {
            alert("Error from server: " + data.message);
            messageDiv.classList.remove('hidden');
            messageDiv.innerText = data.message;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("CRITICAL ERROR: Could not reach the server. Make sure 'node server.js' is running in the terminal!");
=======
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
>>>>>>> 3759db80d9a693123a2bb4d4189b35c4968481f7
    }
});