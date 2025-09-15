// --- 1. IMPORT PACKAGES ---
require('dotenv').config();
const express = require('express');
const { forwardTransaction } = require('./apiForwarder');
const mysql = require('mysql2/promise');
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
app.use(express.static('Public'));

// --- 4. MULTER CONFIGURATION (NEW) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // THIS IS THE CRITICAL FIX:
        // We are constructing an absolute path manually to remove all doubt.
        // It starts from the backend folder, removes 'Backend', and appends 'Public/uploads'.
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
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Abdulhamidu@51', // Your password
    database: 'megalife_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
const db = mysql.createPool(dbConfig);

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
app.get('/', (req, res) => {
    res.json({ message: 'Hello! The Megalife backend server is running.' });
});

// --- PUBLIC AUTHENTICATION ROUTES ---
app.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, telephone, country } = req.body;
        if (!fullName || !email || !password) return res.status(400).json({ message: 'All fields are required.' });
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length > 0) return res.status(409).json({ message: 'An account with this email already exists.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (fullName, email, password, telephone, country) VALUES (?, ?, ?, ?, ?)', [fullName, email, hashedPassword, telephone, country]);
        const dashboardUrl = `http://localhost:5500/UserInterfaces/userdashboard.html?welcome=true`;
        const msg = { to: email, from: 'abdulhamidu51@gmail.com', subject: 'Welcome!', html: `<a href="${dashboardUrl}">Go to Dashboard</a>` };
        await sgMail.send(msg);
        res.status(201).json({ message: 'User registered successfully! Please check your email.' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET ALL ACTIVE BUNDLES (for user purchase pages)
app.get('/bundles', async (req, res) => {
    try {
        // We only select bundles where 'isActive' is true (or 1)
        const [bundles] = await db.query(
            'SELECT * FROM bundles WHERE isActive = 1 ORDER BY provider, price'
        );
        res.status(200).json(bundles);
    } catch (error) {
        console.error('Error fetching active bundles:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});






// --- USER AUTHENTICATION ROUTES ---

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful!', token, user: { id: user.id, fullName: user.fullName } });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// FORGOT PASSWORD ROUTE
// Forgot Password Route (with improved error logging)
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`\n[FORGOT PASSWORD] Step 1: Request received for ${email}.`);

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
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

        await db.query('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?', [hashedToken, tokenExpiry, user.id]);
        console.log('[FORGOT PASSWORD] Step 4: Token successfully saved to database.');

        const resetUrl = `http://127.0.0.1:5501/Megalife_com/Public/reset-password.html?token=${resetToken}`;
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
        const [users] = await db.query('SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiry > NOW()', [hashedToken]);
        if (users.length === 0) return res.status(400).json({ message: 'Token is invalid or has expired.' });
        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?', [hashedPassword, user.id]);
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
        const [users] = await db.query('SELECT id, fullName, email, telephone, country, walletBalance, registrationDate FROM users ORDER BY registrationDate DESC');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
     // GET ALL TRANSACTIONS
app.get('/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
        const query = `SELECT t.*, u.fullName FROM transactions t JOIN users u ON t.userId = u.id ORDER BY t.transactionsDate DESC`;
        const [transactions] = await db.query(query);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching all transactions:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});





// ... (Your existing /admin/transactions route is here) ...



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
            'INSERT INTO bundles (provider, volume, price) VALUES (?, ?, ?)',
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
            'UPDATE bundles SET volume = ?, price = ? WHERE id = ?',
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
        await db.query('DELETE FROM bundles WHERE id = ?', [id]);
        res.status(200).json({ message: 'Bundle deleted successfully.' });
    } catch (error) {
        console.error('Error deleting bundle:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});










// --- PROTECTED USER ROUTES ---
app.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [users] = await db.query('SELECT id, fullName, email, walletBalance FROM users WHERE id = ?', [userId]);
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

        // Query 1: Get the current wallet balance
        const [users] = await db.query('SELECT walletBalance FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        const walletBalance = users[0].walletBalance;

        // Query 2: Get total number of all orders
        const [totalOrdersResult] = await db.query('SELECT COUNT(id) as totalOrders FROM transactions WHERE userId = ?', [userId]);
        const totalOrders = totalOrdersResult[0].totalOrders;

        // Query 3: Get total sales (sum of amounts for bundle purchases only)
        const [totalSalesResult] = await db.query(
            "SELECT SUM(amount) as totalSales FROM transactions WHERE userId = ? AND type != 'Top-Up'", 
            [userId]
        );
        const totalSales = totalSalesResult[0].totalSales || 0; // Default to 0 if null

        // Query 4: Get total number and value of E-Wallet Top-Ups
        const [topUpsResult] = await db.query(
            "SELECT COUNT(id) as totalTopUps, SUM(amount) as totalTopUpValue FROM transactions WHERE userId = ? AND type = 'Top-Up'",
            [userId]
        );
        const totalTopUps = topUpsResult[0].totalTopUps || 0;
        const totalTopUpValue = topUpsResult[0].totalTopUpValue || 0;

        // 5. Send all the data back in a single JSON object
        res.status(200).json({
            walletBalance: walletBalance,
            totalOrders: totalOrders,
            totalSales: totalSales,
            totalTopUps: totalTopUps,
            totalTopUpValue: totalTopUpValue
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ message: 'Server error while fetching summary data.' });
    }
});








// GET BUNDLE ORDERS FOR CURRENT USER
app.get('/user/transactions/bundles', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = `
            SELECT * FROM transactions 
            WHERE userId = ? AND type != 'Top-Up' 
            ORDER BY transactionsDate DESC
        `;
        const [transactions] = await db.query(query, [userId]);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching bundle orders for user:', error);
        res.status(500).json({ message: 'Server error while fetching bundle orders.' });
    }
});

// GET TOP-UP ORDERS FOR CURRENT USER
app.get('/user/transactions/topups', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = `
            SELECT * FROM transactions 
            WHERE userId = ? AND type = 'Top-Up' 
            ORDER BY transactionsDate DESC
        `;
        const [transactions] = await db.query(query, [userId]);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching top-up orders for user:', error);
        res.status(500).json({ message: 'Server error while fetching top-up orders.' });
    }
});

// GET ALL ORDERS FOR CURRENT USER
app.get('/user/transactions/all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = `
            SELECT * FROM transactions 
            WHERE userId = ? 
            ORDER BY transactionsDate DESC
        `;
        const [transactions] = await db.query(query, [userId]);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching all orders for user:', error);
        res.status(500).json({ message: 'Server error while fetching all orders.' });
    }
});


app.post('/initialize-payment', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.userId;
        const [users] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        const userEmail = users[0].email;
        const response = await paystack.transaction.initialize({
            email: userEmail,
            amount: amount * 100,
            // CORRECTED FOR A SINGLE-SERVER SETUP
            callback_url: `http://localhost:3000/UserInterfaces/userdashboard.html?payment_status=success`,
            metadata: { user_id: userId, action: 'wallet_top_up' }
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error initializing payment:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});




// --- SETTINGS MANAGEMENT ---

// GET all settings
app.get('/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const [settings] = await db.query('SELECT * FROM settings');
        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// UPDATE a setting (or create it if it doesn't exist)
app.post('/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const { name, value } = req.body;
        if (!name || value === undefined) {
            return res.status(400).json({ message: 'Setting name and value are required.' });
        }
        // This is an "UPSERT" query: It will UPDATE the row if setting_name exists,
        // or INSERT a new row if it does not.
        const query = 'INSERT INTO settings (setting_name, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?';
        await db.query(query, [name, value, value]);
        res.status(200).json({ message: 'Settings saved successfully.' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// SEND a test email
app.post('/admin/send-test-email', authenticateAdmin, async (req, res) => {
    try {
        const { recipientEmail } = req.body;
        if (!recipientEmail) {
            return res.status(400).json({ message: 'Recipient email is required.' });
        }
        const msg = {
            to: recipientEmail,
            from: 'abdulhamidu51@gmail.com', // Your verified sender
            subject: 'Megalife Email Configuration Test',
            html: '<h1>Success!</h1><p>Your SendGrid email configuration is working correctly.</p>',
        };
        await sgMail.send(msg);
        res.status(200).json({ message: `Test email successfully sent to ${recipientEmail}` });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ message: 'Failed to send test email.' });
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
        
        const [users] = await connection.query('SELECT walletBalance FROM users WHERE id = ? FOR UPDATE', [userId]);
        
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

// This is a simple in-memory queue.
const transactionQueue = [];

function addTransactionToQueue(transactionId) {
    const job = {
        id: transactionId,
        executeAt: Date.now() + 2 * 60 * 1000 // Set to execute in 2 minutes
    };
    transactionQueue.push(job);
    console.log(`Transaction ID ${transactionId} added to the queue. Will be processed in 2 minutes.`);
}

// This is our "worker" that checks the queue periodically.
setInterval(async () => {
    const now = Date.now();
    const jobsToProcess = transactionQueue.filter(job => now >= job.executeAt);

    if (jobsToProcess.length > 0) {
        console.log(`Worker found ${jobsToProcess.length} job(s) to process.`);
    }

    for (const job of jobsToProcess) {
        try {
            // 1. Get the full transaction details from our database
            const [transactions] = await db.query('SELECT * FROM transactions WHERE id = ?', [job.id]);
            if (transactions.length === 0) throw new Error('Transaction not found in DB.');
            
            const transactionDetails = transactions[0];

            // 2. Forward the transaction to the external API
            await forwardTransaction(transactionDetails);

            // 3. If forwarding is successful, update the status in our database
            await db.query("UPDATE transactions SET status = 'Completed' WHERE id = ?", [job.id]);
            console.log(`✅ Transaction ID ${job.id} successfully forwarded and marked as Completed.`);

        } catch (error) {
            // If forwarding fails, mark it as 'Failed' in our database
            await db.query("UPDATE transactions SET status = 'Failed' WHERE id = ?", [job.id]);
            console.error(`❌ Failed to process and forward transaction ID ${job.id}. It has been marked as Failed.`);
        } finally {
            // 4. Remove the job from the queue so we don't process it again
            const index = transactionQueue.findIndex(j => j.id === job.id);
            if (index > -1) {
                transactionQueue.splice(index, 1);
            }
        }
    }
}, 30 * 1000); // The worker will check the queue every 30 seconds



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
        const connection = await db.getConnection();
        console.log('✅ DB Connected.');
        connection.release();
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    } catch (error) {
        console.error('!!! DB CONNECTION FAILED !!!', error.message);
    }
});
