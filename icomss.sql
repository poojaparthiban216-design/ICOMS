-- =================================================================
-- KADAMBAAS — COMPLETE RESET + SCHEMA + TEST DATA
-- Run this single file to get a clean working database every time.
-- mysql -u root -p < kadambaas-full.sql
-- =================================================================

CREATE DATABASE IF NOT EXISTS kadambaas_db;
USE kadambaas_db;

-- -----------------------------------------------------------------
-- STEP 1: WIPE EVERYTHING (correct FK order)
-- -----------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS tracking_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS leftovers;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------
-- STEP 2: CREATE ALL TABLES
-- -----------------------------------------------------------------

CREATE TABLE roles (
    role_id   INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    phone         VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    status        ENUM('Active','Inactive') DEFAULT 'Active',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id INT,
    role_id INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)  ON DELETE CASCADE
);

CREATE TABLE assets (
    asset_id      INT AUTO_INCREMENT PRIMARY KEY,
    asset_type    VARCHAR(50) DEFAULT 'Vessel',
    current_stock INT DEFAULT 0,
    last_updated  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE clients (
    client_id         INT PRIMARY KEY,
    organization_name VARCHAR(150),
    delivery_address  TEXT,
    FOREIGN KEY (client_id) REFERENCES users(user_id)
);

CREATE TABLE orders (
    order_id     INT AUTO_INCREMENT PRIMARY KEY,
    order_code   VARCHAR(20) UNIQUE,
    client_id    INT,
    event_time   DATETIME,
    order_status ENUM('Pending','Preparing','Ready','Dispatched','In Transit','Delivered','Cancelled') DEFAULT 'Pending',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(user_id)
);

CREATE TABLE drivers (
    driver_id      INT PRIMARY KEY,
    license_no     VARCHAR(50),
    current_status ENUM('Available','On Delivery','Offline') DEFAULT 'Available',
    FOREIGN KEY (driver_id) REFERENCES users(user_id)
);

CREATE TABLE deliveries (
    delivery_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT,
    driver_id   INT,
    start_time  DATETIME NULL,
    end_time    DATETIME NULL,
    actual_eta  DATETIME NULL,
    FOREIGN KEY (order_id)  REFERENCES orders(order_id),
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
);

CREATE TABLE tracking_logs (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    delivery_id INT,
    latitude    DECIMAL(10,8),
    longitude   DECIMAL(11,8),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(delivery_id)
);

CREATE TABLE leftovers (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT,
    item_details  TEXT,
    supervisor_id INT,
    submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id)      REFERENCES orders(order_id),
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id)
);

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT,
    message         TEXT,
    type            ENUM('Dispatch','Delay','Delivered','General'),
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- -----------------------------------------------------------------
-- STEP 3: SEED ROLES & ASSETS
-- -----------------------------------------------------------------

INSERT INTO roles (role_name) VALUES
('Admin'), ('Supervisor'), ('Dispatcher'), ('Driver'), ('Client');
-- role_id: 1=Admin 2=Supervisor 3=Dispatcher 4=Driver 5=Client

INSERT INTO assets (asset_type, current_stock) VALUES ('Vessel', 42);

-- -----------------------------------------------------------------
-- STEP 4: USERS  (user_id 1–13)
-- -----------------------------------------------------------------

INSERT INTO users (name, email, password_hash) VALUES
('admin',      'admin@kadambaas.com',    'Admin@123'),       -- 1
('supervisor', 'super@kadambaas.com',    'Supervisor@123'),  -- 2
('dispatcher', 'dispatch@kadambaas.com', 'Dispatcher@123'),  -- 3
('driver',     'mike@kadambaas.com',     'Driver@123'),      -- 4
('client',     'hr@corporation.com',     'Client@123');      -- 5

INSERT INTO users (name, email, phone, password_hash, status) VALUES
('Priya Nair',      'priya@kadambaas.com',   '9876501001', 'Supervisor@123', 'Active'),  -- 6
('Rajan Iyer',      'rajan@kadambaas.com',   '9876501002', 'Dispatcher@123', 'Active'),  -- 7
('Suresh Kumar',    'suresh@kadambaas.com',  '9876501003', 'Driver@123',     'Active'),  -- 8
('Anita Sharma',    'anita@kadambaas.com',   '9876501004', 'Driver@123',     'Active'),  -- 9
('Deepak Verma',    'deepak@kadambaas.com',  '9876501005', 'Driver@123',     'Active'),  -- 10
('Infosys HR Dept', 'hr@infosys-events.com', '8012340001', 'Client@123',     'Active'),  -- 11
('Wipro Cafeteria', 'catering@wipro.com',    '8012340002', 'Client@123',     'Active'),  -- 12
('Biocon Events',   'events@biocon.com',     '8012340003', 'Client@123',     'Active');  -- 13

-- -----------------------------------------------------------------
-- STEP 5: USER ROLES
-- -----------------------------------------------------------------

INSERT INTO user_roles (user_id, role_id) VALUES
(1,  1),  -- admin       → Admin
(2,  2),  -- supervisor  → Supervisor
(3,  3),  -- dispatcher  → Dispatcher
(4,  4),  -- mike        → Driver
(5,  5),  -- client      → Client
(6,  2),  -- Priya       → Supervisor
(7,  3),  -- Rajan       → Dispatcher
(8,  4),  -- Suresh      → Driver
(9,  4),  -- Anita       → Driver
(10, 4),  -- Deepak      → Driver
(11, 5),  -- Infosys     → Client
(12, 5),  -- Wipro       → Client
(13, 5);  -- Biocon      → Client

-- -----------------------------------------------------------------
-- STEP 6: DRIVERS  (driver_id = user_id, must exist in users first)
-- -----------------------------------------------------------------

INSERT INTO drivers (driver_id, license_no, current_status) VALUES
(4,  'KA01AB1234', 'Available'),
(8,  'KA02CD5678', 'Available'),
(9,  'KA03EF9012', 'On Delivery'),
(10, 'KA04GH3456', 'Available');

-- -----------------------------------------------------------------
-- STEP 7: CLIENTS  (client_id = user_id, must exist in users first)
-- -----------------------------------------------------------------

INSERT INTO clients (client_id, organization_name, delivery_address) VALUES
(5,  'HR Corporation',       '#42 MG Road, Ulsoor, Bengaluru 560008'),
(11, 'Infosys Campus',       'Infosys Phase 2, Electronic City, Bengaluru 560100'),
(12, 'Wipro SEZ',            'Wipro Road, Doddakannelli, Bengaluru 560035'),
(13, 'Biocon Research Park', 'Plot 2-4, Phase 4, KIADB, Electronic City, Bengaluru 560100');

-- -----------------------------------------------------------------
-- STEP 8: ORDERS  (client_id must exist in users first)
-- order_id: #8829=1, #8830=2, #8831=3, #8832=4, #8833=5, #8834=6, #8835=7
-- -----------------------------------------------------------------

INSERT INTO orders (order_code, client_id, order_status, event_time, created_at) VALUES
('#8829', 5,  'Delivered',  DATE_SUB(NOW(), INTERVAL 3  HOUR),   DATE_SUB(NOW(), INTERVAL 6  HOUR)),
('#8830', 11, 'In Transit', DATE_ADD(NOW(), INTERVAL 1  HOUR),   DATE_SUB(NOW(), INTERVAL 2  HOUR)),
('#8831', 12, 'Dispatched', DATE_ADD(NOW(), INTERVAL 2  HOUR),   DATE_SUB(NOW(), INTERVAL 1  HOUR)),
('#8832', 13, 'Preparing',  DATE_ADD(NOW(), INTERVAL 4  HOUR),   DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('#8833', 5,  'Pending',    DATE_ADD(NOW(), INTERVAL 6  HOUR),   DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('#8834', 11, 'Ready',      DATE_ADD(NOW(), INTERVAL 3  HOUR),   DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
('#8835', 12, 'Cancelled',  DATE_ADD(NOW(), INTERVAL 8  HOUR),   DATE_SUB(NOW(), INTERVAL 5  HOUR));

-- -----------------------------------------------------------------
-- STEP 9: DELIVERIES  (order_id + driver_id must exist first)
-- delivery_id 1 = #8829 completed, 2 = #8830 active, 3 = #8831 dispatched
-- -----------------------------------------------------------------

INSERT INTO deliveries (order_id, driver_id, start_time, end_time, actual_eta) VALUES
(1, 4,  DATE_SUB(NOW(), INTERVAL 5  HOUR),   DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL),
(2, 9,  DATE_SUB(NOW(), INTERVAL 45 MINUTE), NULL,                              DATE_ADD(NOW(), INTERVAL 1 HOUR)),
(3, 8,  NULL,                                NULL,                              NULL);

-- -----------------------------------------------------------------
-- STEP 10: TRACKING LOGS  (delivery_id must exist first)
-- -----------------------------------------------------------------

-- delivery_id 1 — completed route: Hoodi → ORR → MG Road (mike)
INSERT INTO tracking_logs (delivery_id, latitude, longitude, recorded_at) VALUES
(1, 12.99680000, 77.69720000, DATE_SUB(NOW(), INTERVAL 290 MINUTE)),
(1, 12.99200000, 77.68550000, DATE_SUB(NOW(), INTERVAL 280 MINUTE)),
(1, 12.98750000, 77.67000000, DATE_SUB(NOW(), INTERVAL 270 MINUTE)),
(1, 12.98300000, 77.64500000, DATE_SUB(NOW(), INTERVAL 260 MINUTE)),
(1, 12.98000000, 77.62000000, DATE_SUB(NOW(), INTERVAL 250 MINUTE)),
(1, 12.97750000, 77.61000000, DATE_SUB(NOW(), INTERVAL 240 MINUTE)),
(1, 12.97620000, 77.60330000, DATE_SUB(NOW(), INTERVAL 180 MINUTE));

-- delivery_id 2 — active route: Hoodi → Electronic City (Anita, mid-journey)
INSERT INTO tracking_logs (delivery_id, latitude, longitude, recorded_at) VALUES
(2, 12.99680000, 77.69720000, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(2, 12.98500000, 77.69000000, DATE_SUB(NOW(), INTERVAL 40 MINUTE)),
(2, 12.97000000, 77.68500000, DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
(2, 12.95000000, 77.67500000, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(2, 12.92500000, 77.67000000, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(2, 12.90000000, 77.66500000, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(2, 12.87500000, 77.66300000, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(2, 12.86000000, 77.66150000, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(2, 12.85000000, 77.66080000, DATE_SUB(NOW(), INTERVAL 5  MINUTE));

-- -----------------------------------------------------------------
-- STEP 11: LEFTOVERS  (order_id + supervisor_id must exist first)
-- -----------------------------------------------------------------

INSERT INTO leftovers (order_id, item_details, supervisor_id) VALUES
(1, 'Paneer Butter Masala – 2 kg, Jeera Rice – 4 kg, Dal Tadka – 1.5 kg', 2),
(1, 'Gulab Jamun – 30 pieces, Raita – 2 kg, Papad – 1 bundle',            2);

-- -----------------------------------------------------------------
-- STEP 12: NOTIFICATIONS  (user_id must exist first)
-- -----------------------------------------------------------------

INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES
(1, 'Order #8829 has been successfully delivered to HR Corporation.',          'Delivered', FALSE, DATE_SUB(NOW(), INTERVAL 3  HOUR)),
(1, 'Order #8835 from Wipro Cafeteria has been cancelled.',                    'General',   FALSE, DATE_SUB(NOW(), INTERVAL 5  HOUR)),
(3, 'Driver Anita Sharma is now In Transit for order #8830 to Infosys.',       'Dispatch',  FALSE, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(2, 'Order #8832 for Biocon Events has moved to Preparing stage.',             'General',   TRUE,  DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(1, 'Order #8830 dispatch is running 10 minutes behind schedule.',             'Delay',     FALSE, DATE_SUB(NOW(), INTERVAL 50 MINUTE)),
(9, 'You have been assigned order #8830. Deliver to Infosys Electronic City.', 'Dispatch',  FALSE, DATE_SUB(NOW(), INTERVAL 45 MINUTE));

-- -----------------------------------------------------------------
-- DONE — verify with these queries:
-- -----------------------------------------------------------------
SELECT CONCAT('Users: ', COUNT(*)) AS summary FROM users
UNION ALL SELECT CONCAT('Orders: ',        COUNT(*)) FROM orders
UNION ALL SELECT CONCAT('Deliveries: ',    COUNT(*)) FROM deliveries
UNION ALL SELECT CONCAT('Tracking pings: ',COUNT(*)) FROM tracking_logs
UNION ALL SELECT CONCAT('Notifications: ', COUNT(*)) FROM notifications;