// dbms project 2.0/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

const saltRounds = 10;

// GET: Display Login Page
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/login', {
        title: 'Login',
        error_msg: req.query.error_msg,
        success_msg: req.query.success_msg
    });
});

// POST: Process Login Attempt
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);

    if (!username || !password) {
        console.log('Login failed: Username or password missing in submission.');
        return res.redirect('/auth/login?error_msg=Username and password are required.');
    }

    try {
        console.log(`Querying database for user: ${username}`);
        const [users] = await pool.query('SELECT * FROM Users WHERE username = ?', [username]);

        if (users.length === 0) {
            console.log(`Login failed: User '${username}' not found in database.`);
            return res.redirect('/auth/login?error_msg=Invalid username or password.');
        }

        const user = users[0];
        console.log('User found in DB:', JSON.stringify(user, null, 2));

        if (!user.is_active) {
            console.log(`Login failed: User '${username}' is inactive.`);
            return res.redirect('/auth/login?error_msg=Your account is inactive. Please contact an administrator.');
        }

        console.log(`Comparing submitted password with stored hash for user '${username}'...`);
        const match = await bcrypt.compare(password, user.password_hash);
        console.log(`Password comparison result (match): ${match}`);

        if (match) {
            // --- THIS IS THE CRUCIAL PART THAT WAS MISSING FROM YOUR PROVIDED FILE ---
            // Store user information in session
            req.session.user = {
                userId: user.user_id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            };
            // Optional: Update last_login timestamp
            await pool.query('UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

            console.log(`User '${user.username}' logged in. Session user:`, JSON.stringify(req.session.user)); // Log the session

            const returnTo = req.session.returnTo || '/'; // Get stored URL or default to home
            delete req.session.returnTo; // Clear it after use
            res.redirect(returnTo); // Redirect to originally requested page or home
            // --- END OF CRUCIAL PART ---

        } else {
            console.log(`Login failed: Password mismatch for user '${username}'.`);
            res.redirect('/auth/login?error_msg=Invalid username or password.');
        }
    } catch (err) {
        console.error('Login error in catch block:', err);
        res.redirect('/auth/login?error_msg=An error occurred during login. Please try again.');
    }
});


// GET: Display Registration Page
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/register', {
        title: 'Register New Account',
        error_msg: req.query.error_msg,
        form_data: req.query.form_data ? JSON.parse(req.query.form_data) : {}
    });
});

// POST: Process Registration Attempt
router.post('/register', async (req, res) => {
    const { full_name, username, password, confirm_password } = req.body;
    let errors = [];

    if (!full_name || full_name.trim() === '') { errors.push('Full Name is required.'); }
    if (!username || username.trim() === '') { errors.push('Username is required.'); }
    if (!password || password === '') { errors.push('Password is required.'); }
    if (password !== confirm_password) { errors.push('Passwords do not match.'); }
    if (password && password.length < 6) { errors.push('Password must be at least 6 characters long.'); }

    if (errors.length > 0) {
        const formDataQuery = encodeURIComponent(JSON.stringify({ full_name, username }));
        return res.redirect(`/auth/register?error_msg=${encodeURIComponent(errors.join(' '))}&form_data=${formDataQuery}`);
    }

    try {
        const [existingUsers] = await pool.query('SELECT user_id FROM Users WHERE username = ?', [username.trim()]);
        if (existingUsers.length > 0) {
            const formDataQuery = encodeURIComponent(JSON.stringify({ full_name, username }));
            return res.redirect(`/auth/register?error_msg=${encodeURIComponent('Username already taken. Please choose another.')}&form_data=${formDataQuery}`);
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const defaultRole = 'staff';
        const sql = 'INSERT INTO Users (full_name, username, password_hash, role, is_active) VALUES (?, ?, ?, ?, TRUE)';
        await pool.query(sql, [full_name.trim(), username.trim(), hashedPassword, defaultRole]);

        console.log(`New user registered: ${username}`);
        res.redirect('/auth/login?success_msg=Registration successful! Please log in.');

    } catch (err) {
        console.error('Registration error:', err);
        const formDataQuery = encodeURIComponent(JSON.stringify({ full_name, username }));
        res.redirect(`/auth/register?error_msg=${encodeURIComponent('An error occurred during registration. Please try again.')}&form_data=${formDataQuery}`);
    }
});

// GET: Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login?success_msg=You have been logged out.');
    });
});

module.exports = router;