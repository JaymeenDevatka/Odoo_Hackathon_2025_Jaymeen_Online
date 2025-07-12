const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'rewear_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

const connectDB = async () => {
  try {
    // Create connection pool
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    
    // Initialize database tables
    await initializeTables();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

const initializeTables = async () => {
  try {
    // Drop existing tables to recreate with correct schema
    await pool.execute('DROP TABLE IF EXISTS point_transactions');
    await pool.execute('DROP TABLE IF EXISTS notifications');
    await pool.execute('DROP TABLE IF EXISTS swaps');
    await pool.execute('DROP TABLE IF EXISTS items');
    await pool.execute('DROP TABLE IF EXISTS users');

    // Users table
    await pool.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar VARCHAR(500),
        bio TEXT,
        points INT DEFAULT 100,
        role ENUM('user', 'admin') DEFAULT 'user',
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Items table
    await pool.execute(`
      CREATE TABLE items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(100) NOT NULL,
        size VARCHAR(50),
        \`condition\` ENUM('new', 'like_new', 'good', 'fair', 'poor') NOT NULL,
        tags JSON,
        images JSON,
        points_value INT DEFAULT 0,
        is_available BOOLEAN DEFAULT TRUE,
        is_approved BOOLEAN DEFAULT FALSE,
        ai_category VARCHAR(100),
        ai_tags JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Swaps table
    await pool.execute(`
      CREATE TABLE swaps (
        id INT PRIMARY KEY AUTO_INCREMENT,
        requester_id INT NOT NULL,
        item_id INT NOT NULL,
        offered_item_id INT,
        offered_points INT,
        status ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (offered_item_id) REFERENCES items(id) ON DELETE SET NULL
      )
    `);

    // Points transactions table
    await pool.execute(`
      CREATE TABLE point_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        type ENUM('earned', 'spent', 'refunded') NOT NULL,
        amount INT NOT NULL,
        description VARCHAR(255),
        related_item_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (related_item_id) REFERENCES items(id) ON DELETE SET NULL
      )
    `);

    // Notifications table
    await pool.execute(`
      CREATE TABLE notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        related_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    throw error;
  }
};

const getConnection = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return pool;
};

module.exports = {
  connectDB,
  getConnection,
  pool: () => pool
}; 