const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Test Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Connected to Kadambaas Database');
        connection.release();
    }
});

// --- LOGIN ENDPOINT ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const sql = `
        SELECT u.user_id, u.name, u.password_hash, r.role_name 
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE u.name = ? OR u.email = ?
    `;

    db.query(sql, [username, username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: "User not found" });

        const user = results[0];

        // Direct password check (use bcrypt later for security)
        if (password === user.password_hash) { 
            res.json({ 
                success: true, 
                role: user.role_name, 
                user_id: user.user_id,
                name: user.name
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    });
});

// --- ADMIN STATS ENDPOINT ---
app.get('/api/admin/stats', (req, res) => {
    const sql = `SELECT 
        (SELECT COUNT(*) FROM orders) as totalOrders,
        (SELECT COUNT(*) FROM users) as totalUsers`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results[0]);
    });
});

// --- ADMIN DASHBOARD STATS ---
app.get('/api/admin/dashboard-stats', (req, res) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM orders) as totalOrders,
            (SELECT COUNT(*) FROM users) as totalUsers
    `;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// Get all users with their roles
app.get('/api/users', (req, res) => {
    const sql = `
        SELECT u.user_id, u.name, u.email, r.role_name 
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
}); 

// 1. Endpoint for Drivers to update their location (Every 1 minute)
app.post('/api/driver/update-location', (req, res) => {
    const { order_id, lat, lng } = req.body;
    const sql = "UPDATE orders SET lat = ?, lng = ? WHERE order_id = ?";
    
    db.query(sql, [lat, lng, order_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Location updated" });
    });
});

// 2. Endpoint for Clients to fetch location via Tracking Token
app.get('/api/track/:token', (req, res) => {
    const token = req.params.token;
    const sql = "SELECT order_code, client_name, order_status, lat, lng FROM orders WHERE tracking_token = ?";
    
    db.query(sql, [token], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ success: false, message: "Invalid tracking link" });
        res.json({ success: true, data: results[0] });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});