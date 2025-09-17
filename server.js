// --- 1. IMPORT PACKAGES ---
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg'); // Use the PostgreSQL library
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const path = require('path');
const multer = require('multer');
const { forwardTransaction } = require('./apiForwarder');
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);

// --- 2. INITIALIZE APP & SET API KEYS ---
const app = express();
const PORT = process.env.PORT || 3000;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static('Public'));

// --- 4. MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'Public', 'uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// --- 5. DATABASE CONFIGURATION (FOR NEON POSTGRESQL) ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- 6. AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
        if (err || user.role !== 'admin') return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- 7. BACKGROUND JOB PROCESSING SYSTEM ---
const transactionQueue = [];
function addTransactionToQueue(transactionId) {
    const job = { id: transactionId, executeAt: Date.now() + 2 * 60 * 1000 };
    transactionQueue.push(job);
    console.log(`Transaction ID ${transactionId} added to queue.`);
}
setInterval(async () => {
    const now = Date.now();
    const jobsToProcess = transactionQueue.filter(job => now >= job.executeAt);
    if (jobsToProcess.length > 0) {
        for (const job of jobsToProcess) {
            try {
                const result = await db.query('SELECT * FROM transactions WHERE id = $1', [job.id]);
                if (result.rows.length > 0) {
                    await forwardTransaction(result.rows[0]);
                    await db.query('UPDATE transactions SET status = $1 WHERE id = $2', ['Completed', job.id]);
                    console.log(`✅ Tx ID ${job.id} forwarded & completed.`);
                }
            } catch (error) {
                await db.query('UPDATE transactions SET status = $1 WHERE id = $2', ['Failed', job.id]);
                console.error(`❌ Failed to forward Tx ID ${job.id}.`);
            } finally {
                const index = transactionQueue.findIndex(j => j.id === job.id);
                if (index > -1) transactionQueue.splice(index, 1);
            }
        }
    }
}, 30 * 1000);

// --- 8. API ROUTES (PostgreSQL Syntax) ---

// --- PUBLIC ROUTES ---
app.get('/', (req, res) => res.json({ message: 'Hello! Megalife backend is running.' }));

app.get('/bundles', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bundles WHERE "isActive" = true ORDER BY provider, price');
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

app.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, telephone, country } = req.body;
        if (!fullName || !email || !password) return res.status(400).json({ message: 'All fields are required.' });
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) return res.status(409).json({ message: 'An account with this email already exists.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users ("fullName", email, password, telephone, country) VALUES ($1, $2, $3, $4, $5)', [fullName, email, hashedPassword, telephone, country]);
        const dashboardUrl = `http://localhost:5500/UserInterfaces/userdashboard.html?welcome=true`;
        const msg = { to: email, from: 'abdulhamidu51@gmail.com', subject: 'Welcome!', html: `<a href="${dashboardUrl}">Go to Dashboard</a>` };
        await sgMail.send(msg);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful!', token, user: { id: user.id, fullName: user.fullName } });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
            await db.query('UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3', [hashedToken, tokenExpiry, user.id]);
            const resetUrl = `http://localhost:5500/reset-password.html?token=${resetToken}`;
            const msg = { to: user.email, from: 'abdulhamidu51@gmail.com', subject: 'Password Reset', html: `<a href="${resetUrl}">Reset Password</a>` };
            await sgMail.send(msg);
        }
        res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (error) { res.status(200).json({ message: 'If an account exists, a reset link has been sent.' }); }
});

app.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const result = await db.query('SELECT * FROM users WHERE "resetToken" = $1 AND "resetTokenExpiry" > NOW()', [hashedToken]);
        if (result.rows.length === 0) return res.status(400).json({ message: 'Token is invalid or has expired.' });
        const user = result.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = $1, "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $2', [hashedPassword, user.id]);
        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });
        const admin = result.rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ adminId: admin.id, role: 'admin' }, process.env.JWT_SECRET_KEY, { expiresIn: '8h' });
        res.status(200).json({ message: 'Admin login successful!', token });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

// --- PROTECTED ADMIN ROUTES ---
app.get('/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT id, "fullName", email, telephone, country, "walletBalance", "registrationDate" FROM users ORDER BY "registrationDate" DESC');
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.get('/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
        const query = `SELECT t.*, u."fullName" FROM transactions t JOIN users u ON t."userId" = u.id ORDER BY t."transactionsDate" DESC`;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.get('/admin/bundles', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bundles ORDER BY provider, price');
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.post('/admin/bundles', authenticateAdmin, async (req, res) => {
    try {
        const { provider, volume, price } = req.body;
        await db.query('INSERT INTO bundles (provider, volume, price) VALUES ($1, $2, $3)', [provider, volume, price]);
        res.status(201).json({ message: 'Bundle created.' });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.put('/admin/bundles/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { volume, price } = req.body;
        await db.query('UPDATE bundles SET volume = $1, price = $2 WHERE id = $3', [volume, price, id]);
        res.status(200).json({ message: 'Bundle updated.' });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.delete('/admin/bundles/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM bundles WHERE id = $1', [id]);
        res.status(200).json({ message: 'Bundle deleted.' });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.get('/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM settings');
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.post('/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const { name, value } = req.body;
        const query = 'INSERT INTO settings (setting_name, setting_value) VALUES ($1, $2) ON CONFLICT (setting_name) DO UPDATE SET setting_value = $2';
        await db.query(query, [name, value]);
        res.status(200).json({ message: 'Settings saved.' });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.post('/admin/send-test-email', authenticateAdmin, async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        const msg = { to: recipientEmail, from: 'abdulhamidu51@gmail.com', subject: 'Test', html: '<h1>Success!</h1>' };
        await sgMail.send(msg);
        res.status(200).json({ message: `Test email sent.` });
    } catch (error) { res.status(500).json({ message: 'Failed to send.' }); }
});

// --- PROTECTED USER ROUTES ---
app.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, "fullName", email, "walletBalance" FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.status(200).json(result.rows[0]);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.get('/user/dashboard-summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRes = await db.query('SELECT "walletBalance" FROM users WHERE id = $1', [userId]);
        const ordersRes = await db.query('SELECT COUNT(id) as total FROM transactions WHERE "userId" = $1', [userId]);
        const salesRes = await db.query('SELECT SUM(amount) as total FROM transactions WHERE "userId" = $1 AND type != $2', [userId, 'Top-Up']);
        const topupsRes = await db.query('SELECT COUNT(id) as count, SUM(amount) as value FROM transactions WHERE "userId" = $1 AND type = $2', [userId, 'Top-Up']);
        res.status(200).json({
            walletBalance: userRes.rows[0].walletBalance,
            totalOrders: ordersRes.rows[0].total,
            totalSales: salesRes.rows[0].total || 0,
            totalTopUps: topupsRes.rows[0].count || 0,
            totalTopUpValue: topupsRes.rows[0].value || 0
        });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.get('/user/transactions/bundles', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM transactions WHERE "userId" = $1 AND type != $2 ORDER BY "transactionsDate" DESC', [req.user.userId, 'Top-Up']);
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.get('/user/transactions/topups', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM transactions WHERE "userId" = $1 AND type = $2 ORDER BY "transactionsDate" DESC', [req.user.userId, 'Top-Up']);
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.get('/user/transactions/all', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM transactions WHERE "userId" = $1 ORDER BY "transactionsDate" DESC', [req.user.userId]);
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.post('/initialize-payment', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const result = await db.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
        const response = await paystack.transaction.initialize({
            email: result.rows[0].email,
            amount: amount * 100,
            callback_url: `http://localhost:5500/UserInterfaces/userdashboard.html?payment_status=success`,
            metadata: { user_id: req.user.userId, action: 'wallet_top_up' }
        });
        res.status(200).json(response.data);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});
app.post('/purchase-bundle', authenticateToken, async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { type, details, amount, recipient } = req.body;
        const result = await client.query('SELECT "walletBalance" FROM users WHERE id = $1 FOR UPDATE', [req.user.userId]);
        const currentBalance = parseFloat(result.rows[0].walletBalance);
        if (currentBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(402).json({ message: 'Insufficient balance.' });
        }
        const newBalance = currentBalance - amount;
        await client.query('UPDATE users SET "walletBalance" = $1 WHERE id = $2', [newBalance, req.user.userId]);
        const insertResult = await client.query('INSERT INTO transactions ("userId", "orderId", type, details, amount, status, recipient) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [req.user.userId, Math.floor(1000 + Math.random() * 9000), type, details, amount, 'Processing', recipient]);
        addTransactionToQueue(insertResult.rows[0].id);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Purchase successful!', newBalance });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});
app.post('/user/upload-picture', authenticateToken, upload.single('profilePic'), async (req, res) => {
    try {
        const filePath = `uploads/${req.file.filename}`;
        await db.query('UPDATE users SET "profilePicture" = $1 WHERE id = $2', [filePath, req.user.userId]);
        res.status(200).json({ message: 'Profile picture updated.', filePath });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

// --- WEBHOOK ROUTE ---
app.post('/paystack-webhook', async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.sendStatus(400);
    const event = req.body;
    if (event.event === 'charge.success') {
        const { amount, reference, metadata } = event.data;
        if (metadata && metadata.action === 'wallet_top_up') {
            try {
                const topUpAmount = amount / 100;
                await db.query('UPDATE users SET "walletBalance" = "walletBalance" + $1 WHERE id = $2', [topUpAmount, metadata.user_id]);
                console.log(`Wallet updated for user ${metadata.user_id}.`);
            } catch (error) { console.error('Webhook wallet update error:', error); }
        }
    }
    res.sendStatus(200);
});

// --- 9. START THE SERVER ---
app.listen(PORT, async () => {
    try {
        const client = await db.connect();
        console.log('✅ PostgreSQL DB Connected.');
        client.release();
        console.log(`🚀 Server running on port ${PORT}`);
    } catch (error) {
        console.error('!!! DB CONNECTION FAILED !!!', error.message);
    }
});