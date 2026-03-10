const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || '*',
    methods: ['GET','POST','PUT','PATCH','DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const db = mysql.createPool({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    port:               process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit:    10,
    ssl:                { rejectUnauthorized: false }
});

db.getConnection((err, connection) => {
    if (err) { console.error('❌ Database connection failed:', err.message); }
    else      { console.log('✅ Connected to Kadambaas Database'); connection.release(); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }
    const sql = `
        SELECT u.user_id, u.name, u.email, u.password_hash, u.status, r.role_name
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r       ON ur.role_id = r.role_id
        WHERE u.name = ? OR u.email = ?
        LIMIT 1
    `;
    db.query(sql, [username, username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });
        const user = results[0];
        if (user.status === 'Inactive') return res.status(403).json({ message: 'This account has been deactivated.' });
        if (password !== user.password_hash) return res.status(401).json({ message: 'Invalid credentials.' });
        res.json({ success: true, role: user.role_name, user_id: user.user_id, name: user.name });
    });
});

app.get('/api/client/order/:order_code', (req, res) => {
    const sql = `
        SELECT o.order_id, o.order_code, o.order_status, o.event_time,
               d.delivery_id, u.name AS driver_name, cl.delivery_address,
               tl.latitude, tl.longitude, tl.recorded_at AS last_update
        FROM orders o
        LEFT JOIN deliveries    d  ON d.order_id    = o.order_id
        LEFT JOIN users         u  ON u.user_id     = d.driver_id
        LEFT JOIN clients       cl ON cl.client_id  = o.client_id
        LEFT JOIN tracking_logs tl ON tl.delivery_id = d.delivery_id
            AND tl.log_id = (SELECT MAX(log_id) FROM tracking_logs WHERE delivery_id = d.delivery_id)
        WHERE o.order_code = ? LIMIT 1
    `;
    db.query(sql, [req.params.order_code], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Order not found' });
        res.json(results[0]);
    });
});

app.post('/api/client/login-track', (req, res) => {
    const { username, password } = req.body;
    const sql = `
        SELECT u.user_id, u.name, u.password_hash, r.role_name
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r       ON ur.role_id = r.role_id
        WHERE (u.name = ? OR u.email = ?) AND r.role_name = 'Client'
    `;
    db.query(sql, [username, username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'Client account not found' });
        const user = results[0];
        if (password !== user.password_hash) return res.status(401).json({ message: 'Invalid credentials' });
        const orderSql = `
            SELECT o.order_id, o.order_code, o.order_status, o.event_time,
                   d.delivery_id, u2.name AS driver_name, cl.delivery_address
            FROM orders o
            LEFT JOIN deliveries d  ON d.order_id   = o.order_id
            LEFT JOIN users      u2 ON u2.user_id   = d.driver_id
            LEFT JOIN clients    cl ON cl.client_id = o.client_id
            WHERE o.client_id = ? ORDER BY o.created_at DESC LIMIT 1
        `;
        db.query(orderSql, [user.user_id], (err2, orders) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (orders.length === 0) return res.status(404).json({ message: 'No orders found for your account' });
            res.json({ success: true, client_name: user.name, order: orders[0] });
        });
    });
});

app.get('/api/admin/stats', (req, res) => {
    db.query(
        'SELECT (SELECT COUNT(*) FROM orders) AS totalOrders, (SELECT COUNT(*) FROM users) AS totalUsers',
        (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.json(r[0]); }
    );
});

app.get('/api/admin/live-drivers', (req, res) => {
    const sql = `
        SELECT u.user_id AS driver_id, u.name AS driver_name,
               o.order_id, o.order_code, o.order_status,
               tl.latitude, tl.longitude, tl.recorded_at AS last_update
        FROM deliveries d
        JOIN users  u  ON d.driver_id = u.user_id
        JOIN orders o  ON d.order_id  = o.order_id
        LEFT JOIN tracking_logs tl ON tl.delivery_id = d.delivery_id
            AND tl.log_id = (SELECT MAX(log_id) FROM tracking_logs WHERE delivery_id = d.delivery_id)
        WHERE o.order_status IN ('Dispatched', 'In Transit')
        ORDER BY tl.recorded_at DESC
    `;
    db.query(sql, (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.json(r); });
});

app.get('/api/users', (req, res) => {
    db.query(
        `SELECT u.user_id, u.name, u.email, u.status, r.role_name
         FROM users u LEFT JOIN user_roles ur ON u.user_id=ur.user_id LEFT JOIN roles r ON ur.role_id=r.role_id
         ORDER BY u.created_at DESC`,
        (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.json(r); }
    );
});

app.post('/api/users', (req, res) => {
    const { name, email, role } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: 'name, email, and role are required' });
    const hash = 'Kadambaas@123';
    db.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
            return res.status(500).json({ error: err.message });
        }
        const userId = result.insertId;
        db.query('SELECT role_id FROM roles WHERE role_name = ?', [role], (err2, roles) => {
            if (err2 || roles.length === 0) return res.status(400).json({ error: `Role "${role}" not found` });
            db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roles[0].role_id], (err3) => {
                if (err3) return res.status(500).json({ error: err3.message });
                if (role === 'Driver') db.query('INSERT INTO drivers (driver_id) VALUES (?)', [userId]);
                res.json({ success: true, user_id: userId, default_password: 'Kadambaas@123' });
            });
        });
    });
});

app.delete('/api/users/:id', (req, res) => {
    db.query('DELETE FROM users WHERE user_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ success: true });
    });
});

app.get('/api/orders', (req, res) => {
    db.query(
        `SELECT o.order_id, o.order_code, o.order_status, o.event_time, o.created_at, u.name AS customer_name
         FROM orders o LEFT JOIN users u ON o.client_id=u.user_id ORDER BY o.created_at DESC`,
        (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.json(r); }
    );
});

app.post('/api/orders', (req, res) => {
    const { order_code, order_status, client_id, event_time } = req.body;
    if (!order_code) return res.status(400).json({ error: 'order_code is required' });
    db.query(
        'INSERT INTO orders (order_code, client_id, order_status, event_time) VALUES (?, ?, ?, ?)',
        [order_code, client_id || null, order_status || 'Pending', event_time || null],
        (err, r) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Order code already exists' });
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, order_id: r.insertId });
        }
    );
});

app.patch('/api/orders/:id/status', (req, res) => {
    db.query('UPDATE orders SET order_status=? WHERE order_id=?', [req.body.order_status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ success: true });
    });
});

app.delete('/api/orders/:id', (req, res) => {
    db.query('DELETE FROM orders WHERE order_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ success: true });
    });
});

app.get('/api/dispatch/available-drivers', (req, res) => {
    db.query(
        "SELECT u.user_id, u.name, u.phone, d.current_status FROM users u JOIN drivers d ON u.user_id=d.driver_id WHERE d.current_status='Available'",
        (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.json(r); }
    );
});

app.post('/api/dispatch/assign-driver', (req, res) => {
    const { order_id, driver_id } = req.body;
    db.query('INSERT INTO deliveries (order_id, driver_id) VALUES (?, ?)', [order_id, driver_id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query("UPDATE drivers SET current_status='On Delivery' WHERE driver_id=?", [driver_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            db.query("UPDATE orders SET order_status='Dispatched' WHERE order_id=?", [order_id], (err3) => {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({ success: true, delivery_id: r.insertId });
            });
        });
    });
});

app.get('/api/dispatch/orders', (req, res) => {
    db.query(
        "SELECT order_id AS id, order_code AS name, order_status AS status FROM orders WHERE order_status IN ('Ready','Preparing','Pending') ORDER BY created_at DESC",
        (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.json(r); }
    );
});

app.get('/api/dispatch/vessels', (req, res) => {
    db.query("SELECT current_stock AS count FROM assets WHERE asset_type='Vessel' LIMIT 1", (err, r) => {
        if (err) return res.status(500).json({ error: err.message }); res.json(r[0] || { count: 0 });
    });
});

app.post('/api/dispatch/vessels/update', (req, res) => {
    db.query("UPDATE assets SET current_stock=? WHERE asset_type='Vessel'", [req.body.newCount], (err) => {
        if (err) return res.status(500).json({ error: err.message }); res.json({ success: true, count: req.body.newCount });
    });
});

app.get('/api/driver/:driver_id/active-delivery', (req, res) => {
    const id = parseInt(req.params.driver_id);
    const sql = `
        SELECT d.delivery_id, d.start_time, o.order_id, o.order_code, o.order_status, o.event_time,
               cl.organization_name AS client_org, cl.delivery_address, u.name AS client_name
        FROM deliveries d
        JOIN orders o ON d.order_id=o.order_id JOIN users u ON o.client_id=u.user_id
        LEFT JOIN clients cl ON cl.client_id=o.client_id
        WHERE d.driver_id=? AND o.order_status IN ('Dispatched','In Transit')
        ORDER BY d.delivery_id DESC LIMIT 1
    `;
    db.query(sql, [id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (r.length === 0) return res.status(404).json({ message: 'No active delivery assigned' });
        res.json(r[0]);
    });
});

app.put('/api/driver/start-delivery', (req, res) => {
    const { delivery_id, order_id, driver_id } = req.body;
    db.query('UPDATE deliveries SET start_time=NOW() WHERE delivery_id=?', [delivery_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query("UPDATE orders SET order_status='In Transit' WHERE order_id=?", [order_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            db.query("UPDATE drivers SET current_status='On Delivery' WHERE driver_id=?", [driver_id], (err3) => {
                if (err3) return res.status(500).json({ error: err3.message }); res.json({ success: true });
            });
        });
    });
});

app.put('/api/driver/complete-delivery', (req, res) => {
    const { delivery_id, order_id, driver_id } = req.body;
    db.query('UPDATE deliveries SET end_time=NOW() WHERE delivery_id=?', [delivery_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query("UPDATE orders SET order_status='Delivered' WHERE order_id=?", [order_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            db.query("UPDATE drivers SET current_status='Available' WHERE driver_id=?", [driver_id], (err3) => {
                if (err3) return res.status(500).json({ error: err3.message }); res.json({ success: true });
            });
        });
    });
});

app.put('/api/tracking/update', (req, res) => {
    const { delivery_id, latitude, longitude } = req.body;
    db.query('INSERT INTO tracking_logs (delivery_id, latitude, longitude) VALUES (?, ?, ?)',
        [delivery_id, latitude, longitude],
        (err) => { if (err) return res.status(500).json({ error: err.message }); res.json({ success: true }); }
    );
});

app.get('/api/tracking/latest/:delivery_id', (req, res) => {
    const sql = `
        SELECT tl.latitude, tl.longitude, tl.recorded_at,
               u.name AS driver_name, o.order_status, o.order_code, o.event_time, cl.delivery_address
        FROM tracking_logs tl
        JOIN deliveries d ON tl.delivery_id=d.delivery_id JOIN users u ON d.driver_id=u.user_id
        JOIN orders o ON d.order_id=o.order_id LEFT JOIN clients cl ON cl.client_id=o.client_id
        WHERE tl.delivery_id=? ORDER BY tl.recorded_at DESC LIMIT 1
    `;
    db.query(sql, [req.params.delivery_id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (r.length === 0) return res.status(404).json({ message: 'No tracking data yet' });
        res.json(r[0]);
    });
});

app.get('/api/tracking/history/:delivery_id', (req, res) => {
    db.query(
        'SELECT latitude, longitude, recorded_at FROM tracking_logs WHERE delivery_id=? ORDER BY recorded_at ASC',
        [req.params.delivery_id],
        (err, r) => { if (err) return res.status(500).json({ error: err.message }); res.json(r); }
    );
});

app.get('/api/notifications', (req, res) => {
    const userId = req.query.user_id;
    const sql = userId
        ? 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC'
        : 'SELECT * FROM notifications ORDER BY created_at DESC';
    db.query(sql, userId ? [userId] : [], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(r);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));