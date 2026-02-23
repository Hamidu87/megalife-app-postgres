
// --- 1. IMPORT PACKAGES ---
require('dotenv').config();
const express = require('express');
const { forwardTransaction } = require('./apiForwarder');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs' );
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Brevo = require('@getbrevo/brevo');
const path = require('path');
const multer = require('multer'); 
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);

// --- 2. INITIALIZE APP & SET API KEYS ---
const app = express();
const PORT = 3000;



const apiInstance = new Brevo.TransactionalEmailsApi();
const brevoApiKey = process.env.BREVO_API_KEY;
if (brevoApiKey) {
    // THIS IS THE FIX: .trim() removes any leading/trailing whitespace or newlines
    apiInstance.apiClient.authentications['api-key'].apiKey = brevoApiKey.trim();
} else {
    console.error('CRITICAL: BREVO_API_KEY is not defined in environment variables!');
}
/*<--
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.apiClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
-->*/

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static('Public'));


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


// --- 5. DATABASE CONFIGURATION (FOR NEON POSTGRESQL - FINAL VERSION) ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    keepAlive: true,
    idleTimeoutMillis: 240000, // 4 minutes
    connectionTimeoutMillis: 20000, // 20 seconds
});



/*
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
*/

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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'Public', 'index.html')));
app.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, telephone, country, referralCode } = req.body;
        let referrerId = null;
        if (referralCode) { /* ... check for referrer ... */ }
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) return res.status(409).json({ message: 'Email already exists.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const newReferralCode = crypto.randomBytes(4).toString('hex');
        await db.query(
            'INSERT INTO users ("fullName", email, password, telephone, country, "isVerified", "verificationToken", "referrerId", "referralCode") VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8)',
            [fullName, email, hashedPassword, telephone, country, verificationToken, referrerId, newReferralCode]
        );
        const verificationUrl = `https://www.megalifeconsult.com/verify-email.html?token=${verificationToken}`;
        let emailToSend = new Brevo.SendSmtpEmail(); /* ... create and send email ... */
        await apiInstance.sendTransacEmail(emailToSend);
        res.status(201).json({ message: 'Registration successful! Please check your email.' });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});







app.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, telephone, country } = req.body;
        if (!fullName || !email || !password) return res.status(400).json({ message: 'All fields are required.' });

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) return res.status(409).json({ message: 'An account with this email already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        await db.query(
            'INSERT INTO users ("fullName", email, password, telephone, country, "isVerified", "verificationToken") VALUES ($1, $2, $3, $4, $5, false, $6)',
            [fullName, email, hashedPassword, telephone, country, verificationToken]
        );
        
        const verificationUrl = `https://www.megalifeconsult.com/verify-email.html?token=${verificationToken}`;

// UPGRADE TO AGENT (with Referral Commission Logic)
app.post('/user/upgrade-to-agent', authenticateToken, async (req, res) => {
    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN'); // Start a secure transaction

        const userId = req.user.userId;

        // 1. Get the user's details, including their referrer's ID
        const userResult = await client.query(
            'SELECT role, "walletBalance", "referrerId" FROM users WHERE id = $1 FOR UPDATE', 
            [userId]
        );
        if (userResult.rows.length === 0) throw new Error('User not found.');
        
        const user = userResult.rows[0];
        if (user.role === 'Agent') throw new Error('You are already an Agent.');

        // 2. Get the upgrade fee from settings
        const feeResult = await client.query("SELECT setting_value FROM settings WHERE setting_name = 'agent_upgrade_fee'");
        if (feeResult.rows.length === 0) throw new Error('Agent upgrade fee not set by admin.');
        const upgradeFee = parseFloat(feeResult.rows[0].setting_value);
        
        if (parseFloat(user.walletBalance) < upgradeFee) throw new Error('Insufficient wallet balance to upgrade.');

        // 3. Deduct fee and upgrade the current user's role
        await client.query('UPDATE users SET "walletBalance" = "walletBalance" - $1, role = $2 WHERE id = $3', [upgradeFee, 'Agent', userId]);

        // --- THIS IS THE CRITICAL NEW LOGIC ---
        // 4. Check if this user was referred by someone
        if (user.referrerId) {
            // Calculate the 70% commission
            const referralBonus = upgradeFee * 0.70;
            
            // Add the bonus to the referrer's referralBalance
            await client.query(
                'UPDATE users SET "referralBalance" = "referralBalance" + $1 WHERE id = $2',
                [referralBonus, user.referrerId]
            );
            
            console.log(`✅ Awarded referral bonus of ${referralBonus} to referrer ID ${user.referrerId} for user ${userId}'s upgrade.`);
        }
        // --- END OF NEW LOGIC ---
        
        // 5. If everything succeeds, commit all database changes
        await client.query('COMMIT');
        
        res.status(200).json({ message: 'Congratulations! You have been successfully upgraded to an Agent.' });

    } catch (error) {
        if (client) { await client.query('ROLLBACK'); }
        console.error('Error during agent upgrade:', error);
        res.status(500).json({ message: error.message || 'An error occurred during the upgrade.' });
    } finally {
        if (client) { client.release(); }
    }
});




        
        // --- BREVO EMAIL LOGIC ---
        let sendSmtpEmail = new Brevo.SendSmtpEmail(); 
        sendSmtpEmail.subject = "Verify Your Email Address for Megalife Consult";
        sendSmtpEmail.htmlContent = `
            <div style="font-family: sans-serif; text-align: center; padding: 20px; line-height: 1.6;">
                <h1 style="color: #212529;">Welcome to Megalife Consult!</h1>
                <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
                <p style="margin: 25px 0;">
                    <a href="${verificationUrl}" target="_blank" style="background-color: #F57C00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">Verify My Email</a>
                </p>
                <p>If you did not create an account, please ignore this email.</p>
            </div>
        `;
        sendSmtpEmail.sender = { "name": "Megalife Consult", "email": "support@megalifeconsult.com" };
        sendSmtpEmail.to = [{ "email": email }];

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Verification email sent to ${email} via Brevo.`);
        // --- END OF BREVO LOGIC ---

        res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});










// Email Verification Route (Final PostgreSQL Version)
app.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Verification token is required.' });
        }

        // CORRECTED QUERY: Use $1 and double quotes for camelCase columns
        const result = await db.query(
            'SELECT * FROM users WHERE "verificationToken" = $1', 
            [token]
        );
        
        const users = result.rows;
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired verification token.' });
        }

        const user = users[0];

        // CORRECTED QUERY: Use $1, $2, etc., and double quotes
        await db.query(
            'UPDATE users SET "isVerified" = true, "verificationToken" = NULL WHERE id = $1',
            [user.id]
        );
        
        res.status(200).json({ message: 'Account verified successfully! You can now log in.' });

    } catch (error) {
        console.error('Error during email verification:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// GET ALL ACTIVE BUNDLES (for user purchase pages)


app.get('/bundles', async (req, res) => {
    try {
        // CORRECTED QUERY: Uses PostgreSQL syntax and double quotes
        const result = await db.query(
            'SELECT * FROM bundles WHERE "isActive" = true ORDER BY provider, price'
        );
        // CORRECTED: Sends the data from result.rows
        res.status(200).json(result.rows);
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
/*

app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`\n[FORGOT PASSWORD] Step 1: Request received for ${email}.`);

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
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
    from: 'support@megalifeconsult.com', // Your verified sender
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

*/




app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`\n[FORGOT PASSWORD] Step 1: Request received for ${email}.`);

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const users = result.rows;
        
        if (users.length > 0) {
            const user = users[0];
            console.log(`[FORGOT PASSWORD] Step 2: User ID ${user.id} found.`);

            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
            console.log('[FORGOT PASSWORD] Step 3: Reset token generated.');

            await db.query('UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3', [hashedToken, tokenExpiry, user.id]);
            console.log('[FORGOT PASSWORD] Step 4: Token successfully saved to database.');

            const resetUrl = `https://www.megalifeconsult.com/reset-password.html?token=${resetToken}`;
            
            // --- BREVO EMAIL LOGIC ---
            console.log('[FORGOT PASSWORD] Step 5: Attempting to send email via Brevo...');
            let sendSmtpEmail = new Brevo.SendSmtpEmail();
            sendSmtpEmail.subject = "Your Password Reset Request";
            sendSmtpEmail.htmlContent = `
                <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                    <h2>Password Reset Request</h2>
                    <p>You are receiving this email because a request was made to reset the password for your account.</p>
                    <p>Please click the button below to reset your password. This link is valid for 15 minutes.</p>
                    <a href="${resetUrl}" style="background-color: #F57C00; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Reset My Password</a>
                    <p style="margin-top: 20px;">If you did not request a password reset, please ignore this email.</p>
                </div>
            `;
            sendSmtpEmail.sender = { "name": "Megalife Consult", "email": "support@megalifeconsult.com" };
            sendSmtpEmail.to = [{ "email": user.email }];

            await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log(`[FORGOT PASSWORD] ✅ SUCCESS: Email sent to ${user.email} via Brevo.`);
            // --- END OF BREVO LOGIC ---
        } else {
            console.log(`[FORGOT PASSWORD] Step 2: User with email ${email} not found. Sending generic response.`);
        }
        
        res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('--- ❌ FATAL ERROR in /forgot-password route ---');
        console.error('The request failed. The specific error is:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});





// Reset Password Route (Final PostgreSQL Version)
app.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }
        
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // CORRECTED QUERY: Use $1 and double quotes for camelCase columns
        const result = await db.query(
            'SELECT * FROM users WHERE "resetToken" = $1 AND "resetTokenExpiry" > NOW()', 
            [hashedToken]
        );
        
        const users = result.rows;
        if (users.length === 0) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }
        
        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // CORRECTED QUERY: Use $1, $2, etc., and double quotes
        await db.query(
            'UPDATE users SET password = $1, "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );
        
        res.status(200).json({ message: 'Your password has been reset successfully.' });

    } catch (error) {
        console.error('Error in /reset-password route:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
});

// ADMIN LOGIN ROUTE (Final PostgreSQL Version)
app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // This is the query that was likely causing the error. This version is correct.
        const result = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
        
        const admins = result.rows;
        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const token = jwt.sign(
            { adminId: admin.id, role: 'admin' }, 
            process.env.JWT_SECRET_KEY, 
            { expiresIn: '8h' }
        );
        
        console.log(`Admin user logged in: ${admin.email}`);
        res.status(200).json({ message: 'Admin login successful!', token });

    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ message: 'Server error during admin login.' });
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




// NEW: GET PROFIT ANALYTICS DATA
app.get('/admin/analytics/profit', authenticateAdmin, async (req, res) => {
    try {
        const summaryQuery = `
            SELECT 
                SUM(CASE WHEN "transactionsDate" >= CURRENT_DATE THEN profit ELSE 0 END) AS "todayProfit",
                SUM(CASE WHEN "transactionsDate" >= date_trunc('week', CURRENT_DATE) THEN profit ELSE 0 END) AS "weekProfit",
                SUM(CASE WHEN "transactionsDate" >= date_trunc('month', CURRENT_DATE) THEN profit ELSE 0 END) AS "monthProfit"
            FROM transactions;
        `;
        const result = await db.query(summaryQuery);
        const summary = {
            today: parseFloat(result.rows[0].todayProfit) || 0,
            week: parseFloat(result.rows[0].weekProfit) || 0,
            month: parseFloat(result.rows[0].monthProfit) || 0
        };
        res.status(200).json(summary);
    } catch (error) {
        console.error('Error fetching profit analytics:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// NEW: MANUALLY FORWARD A TRANSACTION
app.post('/admin/transactions/:id/forward', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`Manual forwarding request received for Transaction ID: ${id}`);

    try {
        // 1. Get the full transaction details from our database
        const result = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }
        
        const transactionDetails = result.rows[0];

        // 2. Call our existing, working forwardTransaction function
        await forwardTransaction(transactionDetails);

        // 3. If forwarding is successful, update the status in our database
        await db.query("UPDATE transactions SET status = 'Completed' WHERE id = $1", [id]);
        
        console.log(`✅ Manual forward for Tx ID ${id} was successful.`);
        res.status(200).json({ message: 'Transaction forwarded successfully and marked as Completed.' });

    } catch (error) {
        // If forwarding fails, keep the status as 'Failed'
        console.error(`❌ Manual forward for Tx ID ${id} failed.`);
        // The error details are already logged inside forwardTransaction, so we just send a generic server error.
        res.status(500).json({ message: 'Failed to forward transaction. Check server logs for details.' });
    }
});

     // GET ALL TRANSACTIONS
// GET ALL TRANSACTIONS (Final PostgreSQL Version)
app.get('/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
        const query = `
            SELECT t.*, u."fullName" 
            FROM transactions t 
            JOIN users u ON t."userId" = u.id 
            ORDER BY t."transactionsDate" DESC
        `;
        // THIS IS THE CORRECT PATTERN
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all transactions:', error);
        res.status(500).json({ message: 'Server error while fetching transactions.' });
    }
});

// NEW: GET ANALYTICS SUMMARY DATA
app.get('/admin/analytics/summary', authenticateAdmin, async (req, res) => {
    try {
        const client = await db.connect(); // Get a client for multiple queries
        try {
            // --- TOP-UP QUERIES ---
            const todayTopUpsQuery = `SELECT COUNT(*), SUM(amount) FROM transactions WHERE type = 'Top-Up' AND "transactionsDate" >= CURRENT_DATE`;
            const weekTopUpsQuery = `SELECT COUNT(*), SUM(amount) FROM transactions WHERE type = 'Top-Up' AND "transactionsDate" >= date_trunc('week', CURRENT_DATE)`;
            const monthTopUpsQuery = `SELECT COUNT(*), SUM(amount) FROM transactions WHERE type = 'Top-Up' AND "transactionsDate" >= date_trunc('month', CURRENT_DATE)`;

            // --- BUNDLE SALES QUERIES ---
            const todayBundlesQuery = `SELECT COUNT(*), SUM(amount) FROM transactions WHERE type != 'Top-Up' AND "transactionsDate" >= CURRENT_DATE`;
            const weekBundlesQuery = `SELECT COUNT(*), SUM(amount) FROM transactions WHERE type != 'Top-Up' AND "transactionsDate" >= date_trunc('week', CURRENT_DATE)`;
            const monthBundlesQuery = `SELECT COUNT(*), SUM(amount) FROM transactions WHERE type != 'Top-Up' AND "transactionsDate" >= date_trunc('month', CURRENT_DATE)`;
            
            // --- ANNUAL SALES CHART QUERY ---
            // This is a complex query to get sales for each of the last 12 months
            const annualSalesQuery = `
                SELECT 
                    to_char(date_trunc('month', month_series), 'Mon YYYY') AS month,
                    COALESCE(SUM(t.amount), 0) AS total_sales
                FROM 
                    generate_series(date_trunc('month', current_date - interval '11 months'), current_date, '1 month') AS month_series
                LEFT JOIN 
                    transactions t ON date_trunc('month', t."transactionsDate") = month_series AND t.type != 'Top-Up'
                GROUP BY 
                    month_series
                ORDER BY 
                    month_series;
            `;

            // Run all queries in parallel for maximum speed
            const [
                todayTopUpsRes, weekTopUpsRes, monthTopUpsRes,
                todayBundlesRes, weekBundlesRes, monthBundlesRes,
                annualSalesRes
            ] = await Promise.all([
                client.query(todayTopUpsQuery), client.query(weekTopUpsQuery), client.query(monthTopUpsQuery),
                client.query(todayBundlesQuery), client.query(weekBundlesQuery), client.query(monthBundlesQuery),
                client.query(annualSalesQuery)
            ]);
            
            // Assemble the final data object
            const summary = {
                topUps: {
                    today: { count: parseInt(todayTopUpsRes.rows[0].count), sum: parseFloat(todayTopUpsRes.rows[0].sum) || 0 },
                    week: { count: parseInt(weekTopUpsRes.rows[0].count), sum: parseFloat(weekTopUpsRes.rows[0].sum) || 0 },
                    month: { count: parseInt(monthTopUpsRes.rows[0].count), sum: parseFloat(monthTopUpsRes.rows[0].sum) || 0 },
                },
                bundles: {
                    today: { count: parseInt(todayBundlesRes.rows[0].count), sum: parseFloat(todayBundlesRes.rows[0].sum) || 0 },
                    week: { count: parseInt(weekBundlesRes.rows[0].count), sum: parseFloat(weekBundlesRes.rows[0].sum) || 0 },
                    month: { count: parseInt(monthBundlesRes.rows[0].count), sum: parseFloat(monthBundlesRes.rows[0].sum) || 0 },
                },
                annualSales: annualSalesRes.rows // This will be an array of { month: 'Sep 2025', total_sales: '123.45' }
            };

            res.status(200).json(summary);

        } finally {
            client.release(); // ALWAYS release the client
        }
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ message: 'Server error while fetching analytics.' });
    }
});


// UPDATE A USER'S DETAILS
app.put('/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, telephone, country } = req.body;
        if (!fullName || !email) {
            return res.status(400).json({ message: 'Full name and email are required.' });
        }
        await db.query(
            'UPDATE users SET "fullName" = $1, email = $2, telephone = $3, country = $4 WHERE id = $5',
            [fullName, email, telephone, country, id]
        );
        res.status(200).json({ message: 'User updated successfully.' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// DELETE A USER
app.delete('/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Optional: You might want to delete their transactions too, or keep them for records.
        // For now, we will just delete the user.
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});






// READ all bundles
app.get('/admin/bundles', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bundles ORDER BY provider, user_type, selling_price');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching bundles:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// CREATE a new bundle
app.post('/admin/bundles', authenticateAdmin, async (req, res) => {
    try {
        const { provider, volume, selling_price, supplier_cost, user_type } = req.body;
        if (!provider || !volume || !selling_price || !supplier_cost || !user_type) {
            return res.status(400).json({ message: 'All bundle fields are required.' });
        }
        await db.query(
            'INSERT INTO bundles (provider, volume, selling_price, supplier_cost, user_type) VALUES ($1, $2, $3, $4, $5)',
            [provider, volume, selling_price, supplier_cost, user_type]
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
        const { provider, volume, selling_price, supplier_cost, user_type } = req.body;
        if (!provider || !volume || !selling_price || !supplier_cost || !user_type) {
            return res.status(400).json({ message: 'All bundle fields are required.' });
        }
        await db.query(
            'UPDATE bundles SET provider = $1, volume = $2, selling_price = $3, supplier_cost = $4, user_type = $5 WHERE id = $6',
            [provider, volume, selling_price, supplier_cost, user_type, id]
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
        if (!id || id === 'undefined') return res.status(400).json({ message: 'Invalid bundle ID.' });
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
// SEND a test email (Corrected for Brevo)
app.post('/admin/send-test-email', authenticateAdmin, async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        if (!recipientEmail) {
            return res.status(400).json({ message: 'Recipient email is required.' });
        }
        
        // Use the new Brevo SDK
        let sendSmtpEmail = new Brevo.SendSmtpEmail(); 
        sendSmtpEmail.subject = "Megalife Email Configuration Test";
        sendSmtpEmail.htmlContent = "<h1>Success!</h1><p>Your Brevo email configuration is working correctly.</p>";
        sendSmtpEmail.sender = { "name": "Megalife Consult", "email": "support@megalifeconsult.com" };
        sendSmtpEmail.to = [{ "email": recipientEmail }];

        // Use the 'apiInstance' we defined at the top of the file to send the email
        await apiInstance.sendTransacEmail(sendSmtpEmail);

        res.status(200).json({ message: `Test email successfully sent to ${recipientEmail}` });

    } catch (error) {
        console.error('Error sending test email:', error.message);
        res.status(500).json({ message: 'Failed to send test email. Check server logs.' });
    }
});


// --- PROTECTED USER ROUTES ---
// ... (Your existing /user/profile route is here) ...

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




// CANCEL A "PROCESSING" ORDER (with Time Check)
app.post('/user/transactions/:id/cancel', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    let client;

    try {
        client = await db.connect();
        await client.query('BEGIN');

        // Find the transaction if it belongs to the user
        const txResult = await client.query(
            'SELECT * FROM transactions WHERE id = $1 AND "userId" = $2 FOR UPDATE',
            [id, userId]
        );

        if (txResult.rows.length === 0) {
            throw new Error('Transaction not found or you do not have permission.');
        }
        
        const transaction = txResult.rows[0];
        
        // --- THIS IS THE CRITICAL NEW LOGIC ---

        // Check 1: Can only cancel if status is 'Processing'
        if (transaction.status !== 'Processing') {
            throw new Error('This order can no longer be cancelled.');
        }

        // Check 2: Check how old the transaction is
        const transactionTime = new Date(transaction.transactionsDate).getTime();
        const currentTime = Date.now();
        const ageInSeconds = (currentTime - transactionTime) / 1000;

        // Set the cancellation window (e.g., 110 seconds = 1 minute 50 seconds)
        // This gives a 10-second buffer before our 2-minute worker runs.
        const cancellationWindowSeconds = 110; 

        if (ageInSeconds > cancellationWindowSeconds) {
            throw new Error(`Cancellation window of ${cancellationWindowSeconds} seconds has passed.`);
        }

        // 2. Refund the amount to the user's wallet
        const refundAmount = parseFloat(transaction.amount);
        await client.query(
            'UPDATE users SET "walletBalance" = "walletBalance" + $1 WHERE id = $2',
            [refundAmount, userId]
        );

        // 3. Update the transaction's status to 'Cancelled'
        await client.query(
            "UPDATE transactions SET status = 'Cancelled' WHERE id = $1",
            [id]
        );
        
        // 4. If everything succeeds, commit the changes
        await client.query('COMMIT');

        console.log(`User ${userId} cancelled Order ID ${id}. Refunded: ${refundAmount}`);
        res.status(200).json({ message: 'Order has been successfully cancelled and your wallet has been refunded.' });

    } catch (error) {
        if (client) { await client.query('ROLLBACK'); }
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'An error occurred while cancelling the order.' });
    } finally {
        if (client) { client.release(); }
    }
});

// GET DASHBOARD SUMMARY DATA (UPDATED FOR REFERRALS AND COMMISSION)
app.get('/user/dashboard-summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Query 1 (IMPROVED): Get all user-specific data in one go
        const userQuery = 'SELECT "walletBalance", "commissionBalance", "referralCode" FROM users WHERE id = $1';
        const userRes = await db.query(userQuery, [userId]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const userData = userRes.rows[0];

        // Query 2: Get total number of ALL orders
        const ordersQuery = 'SELECT COUNT(id) as total FROM transactions WHERE "userId" = $1';
        const ordersRes = await db.query(ordersQuery, [userId]);

        // Query 3: Get total sales (bundle purchases)
        const salesQuery = 'SELECT SUM(amount) as total FROM transactions WHERE "userId" = $1 AND type != $2';
        const salesRes = await db.query(salesQuery, [userId, 'Top-Up']);

        // Query 4: Get total top-ups
        const topupsQuery = 'SELECT COUNT(id) as count, SUM(amount) as value FROM transactions WHERE "userId" = $1 AND type = $2';
        const topupsRes = await db.query(topupsQuery, [userId, 'Top-Up']);
        
        // Query 5 (NEW): Get total number of referees
        const refereeQuery = 'SELECT COUNT(id) as totalReferees FROM users WHERE "referrerId" = $1';
        const refereeRes = await db.query(refereeQuery, [userId]);

        // Assemble the final JSON response with all data
        res.status(200).json({
            walletBalance: userData.walletBalance,
            commissionBalance: userData.commissionBalance || 0,
            referralCode: userData.referralCode,
            totalOrders: ordersRes.rows[0].total || 0,
            totalSales: salesRes.rows[0].total || 0,
            totalTopUps: topupsRes.rows[0].count || 0,
            totalTopUpValue: topupsRes.rows[0].value || 0,
            totalReferees: refereeRes.rows[0].totalreferees || 0
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ message: 'Server error while fetching summary data.' });
    }
});





// GET BUNDLE ORDERS FOR CURRENT USER (with Pagination)
app.get('/user/transactions/bundles', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 1. Get the page number from the request's query string (e.g., ?page=2)
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Show 10 items per page
        const offset = (page - 1) * limit;

        // 2. First, get the TOTAL count of bundle transactions for this user
        const countQuery = `SELECT COUNT(*) FROM transactions WHERE "userId" = $1 AND type != 'Top-Up'`;
        const countResult = await db.query(countQuery, [userId]);
        const totalTransactions = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalTransactions / limit);

        // 3. Now, fetch only the 'slice' of transactions for the requested page
        const dataQuery = `
            SELECT * FROM transactions 
            WHERE "userId" = $1 AND type != 'Top-Up' 
            ORDER BY "transactionsDate" DESC
            LIMIT $2 OFFSET $3
        `;
        const dataResult = await db.query(dataQuery, [userId, limit, offset]);
        const transactions = dataResult.rows;

        // 4. Send back a complete data object with pagination info
        res.status(200).json({
            transactions: transactions,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error fetching paginated bundle orders:', error);
        res.status(500).json({ message: 'Server error while fetching bundle orders.' });
    }
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

// WITHDRAW COMMISSION TO MAIN WALLET (NEW)
app.post('/user/commission/withdraw', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    let client;

    try {
        client = await db.connect();
        await client.query('BEGIN'); // Start a secure transaction

        // 1. Get the user's current commission balance and lock the row
        const userResult = await client.query(
            'SELECT "commissionBalance" FROM users WHERE id = $1 FOR UPDATE',
            [userId]
        );

        if (userResult.rows.length === 0) {
            throw new Error('User not found.');
        }

        const commissionBalance = parseFloat(userResult.rows[0].commissionBalance);

        // 2. Check if there is any commission to withdraw
        if (commissionBalance <= 0) {
            throw new Error('You have no commission to withdraw.');
        }

        // 3. Perform the transfer:
        //    - Add the commission amount to the main walletBalance
        //    - Reset the commissionBalance to 0
        await client.query(
            'UPDATE users SET "walletBalance" = "walletBalance" + $1, "commissionBalance" = 0 WHERE id = $2',
            [commissionBalance, userId]
        );
        
        // 4. (Optional but Recommended) Create a transaction record for this event
        await client.query(
            'INSERT INTO transactions ("userId", type, details, amount, status) VALUES ($1, $2, $3, $4, $5)',
            [userId, 'Commission Payout', 'Commission moved to main wallet', commissionBalance, 'Completed']
        );

        // 5. If everything succeeds, commit the changes
        await client.query('COMMIT');

        console.log(`User ${userId} withdrew ${commissionBalance} commission to main wallet.`);
        res.status(200).json({ message: `Successfully moved GH₵ ${commissionBalance.toFixed(2)} to your main wallet.` });

    } catch (error) {
        if (client) { await client.query('ROLLBACK'); }
        console.error('Error during commission withdrawal:', error);
        res.status(400).json({ message: error.message || 'An error occurred.' });
    } finally {
        if (client) { client.release(); }
    }
});


/*
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

*/



// Initialize Wallet Top-Up (Paystack - with Fee Calculation)
app.post('/initialize-payment', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.userId;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'A valid amount is required.' });
        }
        
        const result = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        const userEmail = result.rows[0].email;

        // --- THIS IS THE CRITICAL AND FINAL FIX ---

        // 1. Define the fee percentage.
        const feePercentage = 1.95 / 100; // 1.95%

        // 2. Calculate the fee Paystack will charge on the amount.
        let paystackFee = amount * feePercentage;

        // 3. Paystack has a fee cap for lower amounts. If the fee is over a certain amount, 
        //    we might need to add a flat fee. Let's keep it simple for now and just use the percentage.
        //    A more advanced version would handle fee caps.

        // 4. Calculate the total amount the customer needs to pay.
        const totalAmount = parseFloat(amount) + paystackFee;
        
        // 5. Convert the TOTAL amount to kobo for Paystack.
        const amountInKobo = Math.round(totalAmount * 100);

        const paymentData = {
            email: userEmail,
            amount: amountInKobo, // Send the TOTAL amount to Paystack
            callback_url: `https://www.megalifeconsult.com/UserInterfaces/userdashboard.html?payment_status=success`,
            metadata: { 
                user_id: userId, 
                action: 'wallet_top_up',
                original_amount: amount // We save the original amount in metadata
            }
        };

        const response = await paystack.transaction.initialize(paymentData);
        
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error initializing payment:', error);
        res.status(500).json({ message: 'An error occurred on the server.' });
    }
});









app.post('/purchase-bundle', authenticateToken, async (req, res) => {
    // THIS IS THE FIX: Define client outside the try block
    let client;
    try {
        client = await db.connect(); // Assign the connection to the client
        await client.query('BEGIN');

        const { type, details, amount, recipient } = req.body;
        const userId = req.user.userId;

        const bundleResult = await client.query('SELECT * FROM bundles WHERE provider = $1 AND volume = $2 AND "isActive" = true', [type, details]);
        if (bundleResult.rows.length === 0) throw new Error('Bundle not available.');
        const bundle = bundleResult.rows[0];
        const sellingPrice = parseFloat(bundle.selling_price);
        const supplierPrice = parseFloat(bundle.supplier_cost);

        if (sellingPrice !== amount) throw new Error('Price mismatch error.');
        
        const userResult = await client.query('SELECT "walletBalance" FROM users WHERE id = $1 FOR UPDATE', [userId]);
        const currentBalance = parseFloat(userResult.rows[0].walletBalance);
        
        if (currentBalance < sellingPrice) throw new Error('Insufficient wallet balance.');
        
        const profit = sellingPrice - supplierPrice;
        const commission = sellingPrice * 0.0002;
        const newBalance = currentBalance - sellingPrice;

        await client.query('UPDATE users SET "walletBalance" = $1, "commissionBalance" = "commissionBalance" + $2 WHERE id = $3', [newBalance, commission, userId]);
        
        const randomOrderId = Math.floor(1000 + Math.random() * 9000);

        const insertResult = await client.query(
            'INSERT INTO transactions ("userId", "orderId", type, details, amount, status, recipient, profit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [userId, randomOrderId, type, details, sellingPrice, 'Processing', recipient, profit]
        );
        
        addTransactionToQueue(insertResult.rows[0].id);
        
        await client.query('COMMIT');
        
        res.status(200).json({ message: 'Purchase successful! Your order is being processed.', newBalance });

    } catch (error) {
        if (client) { // Safety check
            await client.query('ROLLBACK');
        }
        console.error('Error during bundle purchase:', error);
        res.status(500).json({ message: error.message || 'An error occurred during the purchase.' });
    } finally {
        if (client) { // Safety check
            client.release(); // Now 'client' is accessible here
        }
    }
});



/*
//WORKING CODE


app.post('/purchase-bundle', authenticateToken, async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN'); // Start a secure transaction block

        const { type, details, amount, recipient } = req.body;
        const userId = req.user.userId;

        // --- 1. VERIFY THE PRODUCT AND PRICE ---
        // Get bundle details from YOUR database to find the official selling price and supplier price
        const bundleResult = await client.query(
            'SELECT * FROM bundles WHERE provider = $1 AND volume = $2 AND "isActive" = true',
            [type, details]
        );

        if (bundleResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'This bundle is no longer available.' });
        }
        
        const bundle = bundleResult.rows[0];
        const sellingPrice = parseFloat(bundle.price);
        const supplierPrice = parseFloat(bundle.supplierPrice); // Assuming you have this column

        // Security Check: Ensure the price sent from the frontend matches the price in your database
        if (sellingPrice !== amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Price mismatch error. Please refresh and try again.' });
        }
        
        // --- 2. CHECK USER BALANCE (THIS IS THE CRITICAL FIX) ---
        const userResult = await client.query('SELECT "walletBalance" FROM users WHERE id = $1 FOR UPDATE', [userId]);
        const currentBalance = parseFloat(userResult.rows[0].walletBalance);
        
        // If the user's current balance is less than the official selling price, stop the transaction.
        if (currentBalance < sellingPrice) {
            await client.query('ROLLBACK'); // Cancel all changes
            return res.status(402).json({ message: 'Insufficient wallet balance. Please top up your wallet.' });
        }

        // --- 3. IF CHECKS PASS, PROCESS THE TRANSACTION ---

        // Calculate the profit for this transaction
        const profit = sellingPrice - supplierPrice;
        
        // Deduct the amount from the user's wallet
        const newBalance = currentBalance - sellingPrice;
        await client.query('UPDATE users SET "walletBalance" = $1 WHERE id = $2', [newBalance, userId]);
        
        // Create a new order ID
        const randomOrderId = Math.floor(1000 + Math.random() * 9000);

        // Insert the complete transaction record, including the calculated profit
        const insertResult = await client.query(
            'INSERT INTO transactions ("userId", "orderId", type, details, amount, status, recipient, profit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [userId, randomOrderId, type, details, sellingPrice, 'Processing', recipient, profit]
        );
        
        // Add the new transaction to the background queue for forwarding
        addTransactionToQueue(insertResult.rows[0].id);
        
        // If all database operations succeed, save them permanently
        await client.query('COMMIT');
        
        // Send a success response to the user
        res.status(200).json({ message: 'Purchase successful! Your order is being processed.', newBalance });

    } catch (error) {
        // If any step in the 'try' block fails, undo all database changes
        await client.query('ROLLBACK');
        console.error('Error during bundle purchase:', error);
        res.status(500).json({ message: 'An error occurred during the purchase.' });
    } finally {
        // Always release the database client back to the pool
        client.release();
    }
});

*/





/*

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



*/


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
// Paystack Webhook (Final PostgreSQL Version)
// Paystack Webhook (Final Corrected Version)

/*
app.post('/paystack-webhook', async (req, res) => {
    // ... (Your existing signature verification logic is here)
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.sendStatus(400);
    
    const event = req.body;
    
    if (event.event === 'charge.success') {
        const { amount, reference, metadata } = event.data;
        if (metadata && metadata.action === 'wallet_top_up') {
            const client = await db.connect(); // Get a client from the pool for a transaction
            try {
                // Start a database transaction
                await client.query('BEGIN');
                
                const topUpAmount = amount / 100;
                const userId = metadata.user_id;

                // 1. Update the user's wallet balance
                await client.query('UPDATE users SET "walletBalance" = "walletBalance" + $1 WHERE id = $2', [topUpAmount, userId]);
                
                // 2. THIS IS THE NEW CODE: Create a record in the transactions table
                await client.query(
                    'INSERT INTO transactions ("userId", "orderId", type, details, amount, status, recipient) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [userId, reference, 'Top-Up', 'Wallet Top-Up', topUpAmount, 'Completed', null]
                );
                
                // If both queries succeed, commit the transaction
                await client.query('COMMIT');
                
                console.log(`Wallet updated AND transaction recorded for user ${userId}. Ref: ${reference}`);
            } catch (error) {
                // If anything fails, roll back the transaction
                await client.query('ROLLBACK');
                console.error('Webhook processing error:', error);
            } finally {
                // ALWAYS release the client
                client.release();
            }
        }
    }
    
    res.sendStatus(200);
});



*/






// Paystack Webhook (Corrected to Record Transaction)
// Paystack Webhook (CORRECTED to use original_amount from metadata)
app.post('/paystack-webhook', async (req, res) => {
    // This part verifies the request is from Paystack
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
        return res.sendStatus(400);
    }
    
    const event = req.body;

    if (event.event === 'charge.success') {
        // We get the data object from the event
        const { reference, metadata } = event.data;
        
        // We only proceed if this is a wallet top-up
        if (metadata && metadata.action === 'wallet_top_up') {
            const client = await db.connect();
            try {
                await client.query('BEGIN');

                // THIS IS THE CRITICAL FIX:
                // We use the 'original_amount' we saved in the metadata.
                // This is the amount the user INTENDED to top up (e.g., 10.00).
                const topUpAmount = metadata.original_amount; 
                const userId = metadata.user_id;

                if (!topUpAmount || !userId) {
                    throw new Error('Webhook metadata is missing original_amount or user_id.');
                }

                // 1. Update the user's wallet balance with the CORRECT amount
                await client.query('UPDATE users SET "walletBalance" = "walletBalance" + $1 WHERE id = $2', [topUpAmount, userId]);

                // 2. Create a record in the transactions table with the CORRECT amount
                await client.query(
                    'INSERT INTO transactions ("userId", type, details, amount, status) VALUES ($1, $2, $3, $4, $5)',
                    [userId, 'Top-Up', 'Wallet Top-Up', topUpAmount, 'Completed']
                );

                await client.query('COMMIT');
                
                console.log(`✅ Wallet updated AND transaction recorded for user ${userId}. Amount: GH₵${topUpAmount}. Ref: ${reference}`);
            } catch (error) {
                await client.query('ROLLBACK');
                console.error('Webhook processing error:', error);
            } finally {
                client.release();
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
