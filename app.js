// dbms project 2.0/app.js

require('dotenv').config();

const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const pool = require('./config/db');
const session = require('express-session'); 
const authRouter = require('./routes/auth'); // For login/logout routes

const itemsRouter = require('./routes/items');
const categoriesRouter = require('./routes/categories');
const suppliersRouter = require('./routes/suppliers');
const customerRouter = require('./routes/customer');
const salesRouter = require('./routes/sales'); 


const app = express();
const port = process.env.APP_PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'alif', // Store in .env for production!
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        maxAge: 1000 * 60 * 60 * 24 // Cookie expiry (e.g., 24 hours)
        // httpOnly: true, // default is true, helps prevent XSS
    }
}));

// Middleware to make user info available in all views if logged in
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user; // Make user available in .ejs templates
    next();
});
// --- DEFINE ROUTES ---
// Home page route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'DBMS Project - Home', // This one was correct
    mainHeading: 'DBMS Project 2.0 - Database Connection Setup Complete!'
  });
});
app.use('/auth', authRouter); // Mount auth routes under /auth prefix
app.use('/items', itemsRouter);
app.use('/categories', categoriesRouter);
app.use('/sales', salesRouter);
app.use('/customer', customerRouter);
app.use('/suppliers', suppliersRouter);


// Placeholder routes for other sections
app.get('/customer', (req, res) => {
    res.render('index', {
        title: 'Customers', // CHANGED from pageTitle to title
        mainHeading: 'Customer Management (To Be Implemented)'
    });
});
app.get('/sales', (req, res) => {
    res.render('index', {
        title: 'Sales', // CHANGED from pageTitle to title
        mainHeading: 'Sales Processing (To Be Implemented)'
    });
});
// --- END ROUTES ---


// Optional: Basic 404 handler
app.use((req, res, next) => {
    res.status(404).render('error', {
        title: 'Page Not Found', // CHANGED from pageTitle to title
        message: 'Sorry, the page you are looking for could not be found.'
    });
});

// Optional: Basic error handler
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err.stack);
    res.status(500).render('error', {
        title: 'Server Error', // Ensure this is 'title'
        message: 'Something went wrong on our side. Please try again later.'
    });
});

app.listen(port, () => {
  console.log(`Server for DBMS Project 2.0 is running on http://localhost:${port}`);
});