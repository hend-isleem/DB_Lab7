require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const {
    MYSQL_HOST = '127.0.0.1',
    MYSQL_PORT = '3306',
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = '0000',
    MYSQL_DB = 'lab7_db',
    PORT = 3000,
} = process.env;

const app = express();
app.use(express.json());

// We'll keep one pool per DB (created after init)
let pool;

/**
 * Initialize DB:
 *  - Connect without a DB to create the database if missing
 *  - Create tables if they don't exist
 *  - Create a connection pool for the app to use
 */
async function initDatabase() {
    // 1) Create the database if it doesn't exist
    const bootstrap = await mysql.createConnection({
        host: MYSQL_HOST,
        port: Number(MYSQL_PORT),
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        multipleStatements: true,
    });

    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await bootstrap.end();

    // 2) Create a pool connected to the target DB
    pool = mysql.createPool({
        host: MYSQL_HOST,
        port: Number(MYSQL_PORT),
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DB,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        namedPlaceholders: true
    });

    // 3) Create tables
    //   await pool.query(`
    //   CREATE TABLE IF NOT EXISTS users 
    // `);

    // await pool.query(`
    //   CREATE TABLE IF NOT EXISTS posts
    // `);

    console.log('Database initialized and tables ready.');
}

/** Basic health */
app.get('/health', (_req, res) => res.json({ ok: true }));

/** List users */
app.get('/users', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

/** Create user */
app.post('/users', async (req, res) => {
    try {
        const { name, email } = req.body || {};
        if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

        const sql = 'INSERT INTO users (name, email) VALUES (:name, :email)';
        const [result] = await pool.execute(sql, { name, email });
        res.status(201).json({ id: result.insertId, name, email });
    } catch (err) {
        console.error(err);
        // Handle duplicate email nicely
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/** List posts (optionally filter by user_id) */
app.get('/posts', async (req, res) => {
    try {
        const { user_id } = req.query;
        let rows;
        if (user_id) {
            [rows] = await pool.execute(
                `SELECT p.id, p.title, p.body, p.created_at, u.id AS user_id, u.name, u.email
         FROM posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.user_id = :user_id
         ORDER BY p.id DESC`,
                { user_id }
            );
        } else {
            [rows] = await pool.query(
                `SELECT p.id, p.title, p.body, p.created_at, u.id AS user_id, u.name, u.email
         FROM posts p
         JOIN users u ON u.id = p.user_id
         ORDER BY p.id DESC`
            );
        }
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list posts' });
    }
});

/** Create post */
app.post('/posts', async (req, res) => {
    try {
        const { user_id, title, body } = req.body || {};
        if (!user_id || !title) return res.status(400).json({ error: 'user_id and title are required' });

        // ensure user exists
        const [users] = await pool.execute('SELECT id FROM users WHERE id = :id', { id: user_id });
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        const sql = 'INSERT INTO posts (user_id, title, body) VALUES (:user_id, :title, :body)';
        const [result] = await pool.execute(sql, { user_id, title, body: body || null });
        res.status(201).json({ id: result.insertId, user_id, title, body: body || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

/** Get a user with their posts */
app.get('/users/:id/posts', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [[user]] = await pool.execute('SELECT id, name, email, created_at FROM users WHERE id = :id', { id });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const [posts] = await pool.execute(
            'SELECT id, title, body, created_at FROM posts WHERE user_id = :id ORDER BY id DESC',
            { id }
        );
        res.json({ user, posts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user posts' });
    }
});

/** Graceful shutdown */
async function shutdown() {
    try {
        console.log('Shutting down...');
        if (pool) await pool.end();
        process.exit(0);
    } catch (e) {
        console.error('Error during shutdown:', e);
        process.exit(1);
    }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

(async () => {
    try {
        await initDatabase();
        app.listen(Number(PORT), () => {
            console.log(`API listening on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start app:', err);
        process.exit(1);
    }
})();
