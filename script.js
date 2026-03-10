console.log("Script.js loaded successfully!");

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
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
        });

        const data = await response.json();
        console.log("Server Response:", data);

        if (data.success) {
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
    }
});