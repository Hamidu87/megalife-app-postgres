
// --- 1. IMPORT PACKAGES ---
require('dotenv').config();
const express = require('express');
const { forwardTransaction } = require('./apiForwarder');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const path = require('path');
const multer = require('multer'); 
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);

// --- 2. INITIALIZE APP & SET API KEYS ---
const app = express();
const PORT = 3000;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'Public')));

// --- 4. MULTER CONFIGURATION (NEW) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const projectRoot = path.resolve(__dirname, '..'); 
        const uploadPath = path.join(projectRoot, 'Public', 'uploads');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 5. DATABASE CONFIGURATION ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
// --- 6. AUTHENTICATION MIDDLEWARE (DEFINED BEFORE USE) ---
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

// --- 7. API ROUTES ---

// Homepage Route
// Homepage Route - Now serves the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'login.html'));
});
app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'signup.html'));
});
app.get('/forgot-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'forgot-password.html'));
});
app.get('/reset-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'reset-password.html'));
});
app.get('/verify-email.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'verify-email.html'));
});



// An optional API status route
app.get('/api/status', (req, res) => {
    res.json({ message: 'Hello! The Megalife backend server is running.' });
});

// --- PUBLIC AUTHENTICATION ROUTES ---
// User Registration Route (with Verification)

app.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, telephone, country } = req.body;
        if (!fullName || !email || !password) return res.status(400).json({ message: 'All fields are required.' });

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const users = result.rows
        if (users.length > 0) return res.status(409).json({ message: 'An account with this email already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

         await db.query(
            'INSERT INTO users ("fullName", email, password, telephone, country, "isVerified", "verificationToken") VALUES ($1, $2, $3, $4, $5, false, $6)',
            [fullName, email, hashedPassword, telephone, country, verificationToken]
        );
        
        // --- THIS IS THE CRITICAL FIX ---

        // 1. THE CORRECT URL for the verification link
        //    It points to your Live Server and the correct file inside the Public folder.
        const verificationUrl = `https://www.megalifeconsult.com/Public/verify-email.html?token=${verificationToken}`;

        // 2. THE CORRECT HTML to make the link a styled button
        const msg = {
            to: email,
            from: 'abdulhamidu51@gmail.com', // Your verified sender
            subject: 'Verify Your Email Address for Megalife Consult',
            html: `
                <div style="font-family: sans-serif; text-align: center; padding: 20px; line-height: 1.6;">
                    <h1 style="color: #212529;">Welcome to Megalife Consult!</h1>
                    <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
                    <p style="margin: 25px 0;">
                        <a href="${verificationUrl}" target="_blank" style="background-color: #F57C00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">Verify My Email</a>
                    </p>
                    <p>If you did not create an account, please ignore this email.</p>
                </div>
            `,
        };
        
        await sgMail.send(msg);
console.log(`Verification email sent to ${email}`);

// THIS IS THE NEW, CORRECT MESSAGE
res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// NEW: Email Verification Route
// Email Verification Route (for MySQL)
app.post('/verify-email', async (req, res) => {
    
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Verification token is required.' });

        // Use '?' for MySQL
        const result = await db.query('SELECT * FROM users WHERE verificationToken = ?', [token]);
        const users = result.rows;
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired verification token.' });
        }
        const user = users[0];

        // Use '$1' for MySQL
        await db.query(
            'UPDATE users SET "isVerified" = 1, "verificationToken" = NULL WHERE id = $1',

            [user.id]

        );
        
        res.status(200).json({ message: 'Account verified successfully! You can now log in.' });

    } catch (error) {
        console.error('Error during email verification:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// GET ALL ACTIVE BUNDLES (for user purchase pages)
app.get('/bundles', async (req, res) => {
    try {
        // We only select bundles where 'isActive' is true (or 1)
        const [bundles] = await db.query(
            'SELECT * FROM bundles WHERE "isActive" = 1 ORDER BY provider, price'
        );
        res.status(200).json(bundles);
    } catch (error) {
        console.error('Error fetching active bundles:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});






// --- USER AUTHENTICATION ROUTES ---

// User Login Route (with Verification Check)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`\n--- USER LOGIN ATTEMPT: ${email} ---`);

        if (!email || !password) {
            console.log("FAIL: Email or password missing.");
            return res.status(400).json({ message: 'Please provide both email and password.' });
        }

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const users = result.rows;
        if (users.length === 0) {
            console.log(`FAIL: No user found for email ${email}.`);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = users[0];
        console.log(`Step 1: User found in DB. ID: ${user.id}, Verified status: ${user.isVerified}`);

        // This is the robust verification check
        if (user.isVerified == 0) { // Using == to handle both number 0 and boolean false
            console.log(`FAIL: User ${user.id} is not verified.`);
            return res.status(403).json({ message: 'Your account has not been verified. Please check your email.' });
        }
        console.log(`Step 2: User is verified. Proceeding to password check.`);

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log(`FAIL: Password comparison failed for user ${user.id}.`);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        console.log(`Step 3: Password is correct. Proceeding to create token.`);
        
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        
        console.log(`✅ SUCCESS: Token created for user ${user.id}. Login successful.`);
        res.status(200).json({ message: 'Login successful!', token, user: { id: user.id, fullName: user.fullName } });

    } catch (error) {
        console.error('--- ❌ FATAL ERROR in /login route ---');
        console.error(error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});
// FORGOT PASSWORD ROUTE
// Forgot Password Route (with improved error logging)
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`\n[FORGOT PASSWORD] Step 1: Request received for ${email}.`);

        const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const users = result.rows;
        if (users.length === 0) {
            console.log(`[FORGOT PASSWORD] Step 2: User with email ${email} not found. Sending generic response.`);
            // We still send a 200 OK to prevent email enumeration
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const user = users[0];
        console.log(`[FORGOT PASSWORD] Step 2: User ID ${user.id} found.`);

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        console.log('[FORGOT PASSWORD] Step 3: Reset token generated.');

        await db.query('UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3', [hashedToken, tokenExpiry, user.id]);
        console.log('[FORGOT PASSWORD] Step 4: Token successfully saved to database.');

        const resetUrl = `https://www.megalifeconsult.com/reset-password.html?token=${resetToken}`;
        const msg = {
    to: user.email,
    from: 'abdulhamidu51@gmail.com', // Your verified sender
    subject: 'Your Password Reset Request',
    html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>You are receiving this email because a request was made to reset the password for your account.</p>
            <p>Please click the button below to reset your password. This link is valid for 15 minutes.</p>
            <a href="${resetUrl}" style="background-color: #F57C00; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Reset My Password</a>
            <p style="margin-top: 20px;">If you did not request a password reset, please ignore this email.</p>
        </div>
    `,
};

        console.log('[FORGOT PASSWORD] Step 5: Attempting to send email via SendGrid...');
        await sgMail.send(msg);
        
        console.log(`[FORGOT PASSWORD] ✅ SUCCESS: Email sent to ${user.email}.`);
        
        res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        // THIS IS THE MOST IMPORTANT PART
        console.error('--- ❌ FATAL ERROR in /forgot-password route ---');
        console.error('The request failed. The specific error is:');
        console.error(error); // This will print the exact database or SendGrid error
        
        // We send a generic message to the frontend, but the real error is in our terminal.
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

app.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ message: 'Token and password are required.' });
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const result = await db.query('SELECT * FROM users WHERE "resetToken" = $1 AND "resetTokenExpiry" > NOW()', [hashedToken]);
        const users = result.rows;
        if (users.length === 0) return res.status(400).json({ message: 'Token is invalid or has expired.' });
        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(
    'UPDATE users SET password = $1, "isVerified" = 1, "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $1',
    [hashedPassword, user.id]);
        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Error in reset-password:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
        const [admins] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (admins.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });
        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ adminId: admin.id, role: 'admin' }, process.env.JWT_SECRET_KEY, { expiresIn: '8h' });
        res.status(200).json({ message: 'Admin login successful!', token });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- PROTECTED ADMIN ROUTES ---
app.get('/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT id, "fullName", email, telephone, country, "walletBalance", "registrationDate" FROM users ORDER BY "registrationDate" DESC');
        const users = result.rows;
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
     // GET ALL TRANSACTIONS
app.get('/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
        const query = `SELECT t.*, u."fullName" FROM transactions t JOIN users u ON t."userId" = u.id ORDER BY t."transactionsDate" DESC`;
        const [transactions] = await db.query(query);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching all transactions:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
// --- BUNDLE MANAGEMENT (CRUD) ---
// READ all bundles
app.get('/admin/bundles', authenticateAdmin, async (req, res) => {
    try {
        const [bundles] = await db.query('SELECT * FROM bundles ORDER BY provider, price');
        res.status(200).json(bundles);
    } catch (error) {
        console.error('Error fetching bundles:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// CREATE a new bundle
app.post('/admin/bundles', authenticateAdmin, async (req, res) => {
    try {
        const { provider, volume, price } = req.body;
        if (!provider || !volume || !price) {
            return res.status(400).json({ message: 'Provider, volume, and price are required.' });
        }
        await db.query(
            'INSERT INTO bundles (provider, volume, price) VALUES ($1, $2, $3)',
            [provider, volume, price]
        );
        res.status(201).json({ message: 'Bundle created successfully.' });
    } catch (error) {
        console.error('Error creating bundle:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// UPDATE a bundle
app.put('/admin/bundles/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { volume, price } = req.body;
        if (!volume || !price) {
            return res.status(400).json({ message: 'Volume and price are required.' });
        }
        await db.query(
            'UPDATE bundles SET volume = $1, price = $2 WHERE id = $3',
            [volume, price, id]
        );
        res.status(200).json({ message: 'Bundle updated successfully.' });
    } catch (error) {
        console.error('Error updating bundle:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// DELETE a bundle
app.delete('/admin/bundles/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM bundles WHERE id = $1', [id]);
        res.status(200).json({ message: 'Bundle deleted successfully.' });
    } catch (error) {
        console.error('Error deleting bundle:', error);
        res.status(500).json({ message: 'Server error.' });
    }
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
        const userId = req.user.userId;
        const result = await db.query('SELECT id, "fullName", email, "walletBalance" FROM users WHERE id = $1', [userId]);
        const users = result.rows;
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.status(200).json(users[0]);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ... (Your existing /user/profile route is here) ...

// GET DASHBOARD SUMMARY DATA
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

// GET BUNDLE ORDERS FOR CURRENT USER


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
            callback_url: `https://www.megalifeconsult.com/UserInterfaces/userdashboard.html?payment_status=success`,
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

// Data Bundle Purchase
// Data Bundle Purchase (Final Corrected Version)
app.post('/purchase-bundle', authenticateToken, async (req, res) => {
    const connection = await db.getConnection(); 
    try {
        await connection.beginTransaction();

        const { type, details, amount, recipient } = req.body; 
        const userId = req.user.userId;

        if (!type || !details || !amount || !recipient || amount <= 0) {
            return res.status(400).json({ message: 'Missing all required purchase information.' });
        }
        
        const [users] = await connection.query('SELECT walletBalance FROM users WHERE id = $1 FOR UPDATE', [userId]);
        
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = users[0];
        const currentBalance = parseFloat(user.walletBalance);

        if (currentBalance < amount) {
            await connection.rollback();
            return res.status(402).json({ message: 'Insufficient wallet balance.' });
        }
        
        const newBalance = currentBalance - amount;
        await connection.query('UPDATE users SET walletBalance = ? WHERE id = ?', [newBalance, userId]);

        const randomOrderId = Math.floor(1000 + Math.random() * 9000);
        
        // This query is now correct and expects the clean "details"
        const [insertResult] = await connection.query(
            'INSERT INTO transactions (userId, orderId, type, details, amount, status, recipient) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, randomOrderId, type, details, amount, 'Processing', recipient]
        );
        
        const newTransactionId = insertResult.insertId;
        addTransactionToQueue(newTransactionId);
        
        await connection.commit();
        res.status(200).json({ message: 'Purchase successful! Your order is being processed.', newBalance });

    } catch (error) {
        await connection.rollback(); 
        console.error('Error during bundle purchase:', error);
        res.status(500).json({ message: 'An error occurred during the purchase.' });
    } finally {
        connection.release();
    }
});

// --- 7. BACKGROUND JOB PROCESSING SYSTEM (NEW) ---
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


// --- WEBHOOK ROUTE ---
app.post('/paystack-webhook', async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
        return res.sendStatus(400);
    }
    const event = req.body;
    if (event.event === 'charge.success') {
        const { amount, reference, metadata } = event.data;
        if (metadata && metadata.action === 'wallet_top_up') {
            try {
                const topUpAmount = amount / 100;
                await db.query('UPDATE users SET walletBalance = walletBalance + ? WHERE id = ?', [topUpAmount, metadata.user_id]);
                console.log(`Wallet updated for user ${metadata.user_id}.`);
            } catch (error) {
                console.error('Webhook wallet update error:', error);
            }
        }
    }
    res.sendStatus(200);
});


// UPLOAD USER PROFILE PICTURE
app.post('/user/upload-picture', authenticateToken, upload.single('profilePic'), async (req, res) => {
    try {
        const userId = req.user.userId;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file was uploaded.' });
        }

        // The path to the file will be relative to the 'Public' folder
        const filePath = `uploads/${req.file.filename}`;

        // Update the user's record in the database with the new file path
        await db.query('UPDATE users SET profilePicture = ? WHERE id = ?', [filePath, userId]);

        console.log(`User ${userId} uploaded a new profile picture: ${filePath}`);
        res.status(200).json({ message: 'Profile picture updated successfully.', filePath: filePath });

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ message: 'Server error during file upload.' });
    }
});








// --- 7. START THE SERVER ---
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
