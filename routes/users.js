// dbms project 2.0/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// GET: Display Login Page
router.get('/login', (req, res) => {
    if (req.session.user) { // If already logged in, redirect to home
        return res.redirect('/');
    }
    res.render('auth/login', { // We'll create views/auth/login.ejs
        title: 'Login',
        error_msg: req.query.error_msg, // For showing login errors
        success_msg: req.query.success_msg
    });
});

// POST: Process Login Attempt
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.redirect('/auth/login?error_msg=Username and password are required.');
    }

    try {
        const [users] = await pool.query('SELECT * FROM Users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.redirect('/auth/login?error_msg=Invalid username or password.');
        }

        const user = users[0];

        if (!user.is_active) {
             return res.redirect('/auth/login?error_msg=Your account is inactive. Please contact an administrator.');
        }

        // Compare submitted password with stored hashed password
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            // Passwords match - Login successful
            // Store user information in session (DO NOT store password_hash in session)
            req.session.user = {
                userId: user.user_id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            };
            // Optional: Update last_login timestamp
            await pool.query('UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

            console.log(`User '${user.username}' logged in successfully.`);
            res.redirect('/'); // Redirect to home page or dashboard
        } else {
            // Passwords do not match
            res.redirect('/auth/login?error_msg=Invalid username or password.');
        }
    } catch (err) {
        console.error('Login error:', err);
        res.redirect('/auth/login?error_msg=An error occurred during login. Please try again.');
    }
});

// GET: Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/'); // Or an error page
        }
        res.clearCookie('connect.sid'); // Optional: clear the session cookie, name might vary based on session store
        res.redirect('/auth/login?success_msg=You have been logged out.');
    });
});


module.exports = router;