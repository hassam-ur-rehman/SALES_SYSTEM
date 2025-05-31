// dbms project 2.0/routes/customer.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET: Display all customers
router.get('/', async (req, res) => {
    try {
        const [customers] = await pool.query('SELECT * FROM Customer ORDER BY last_name, first_name ASC');
        res.render('customer/list', {
            title: 'Manage Customers',
            customers: customers,
            success_msg: req.query.success_msg,
            error_msg: req.query.error_msg
        });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).render('error', {
            title: 'Database Error',
            message: 'Could not retrieve customers.'
        });
    }
});

// GET: Show form to add a new customer
router.get('/add', (req, res) => {
    res.render('customer/form', {
        title: 'Add New Customer',
        customer: {}, // Empty object for a new customer
        action: '/customer/add',
        submitButtonText: 'Add Customer',
        error_msg: req.query.error_msg,
        form_data: {}
    });
});

// POST: Process adding a new customer
router.post('/add', async (req, res) => {
    const { first_name, last_name, email, phone, address, customer_type } = req.body;
    let errors = [];

    if (!first_name || first_name.trim() === '') {
        errors.push('First Name is required.');
    }
    // Add more validation as needed (e.g., email format, phone format)
    if (email && email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(email.trim())) {
        errors.push('Please enter a valid email address.');
    }


    if (errors.length > 0) {
        return res.render('customer/form', {
            title: 'Add New Customer',
            customer: {}, // Keep customer empty, pass form_data
            action: '/customer/add',
            submitButtonText: 'Add Customer',
            error_msg: errors.join(' '),
            form_data: req.body
        });
    }

    try {
        const sql = 'INSERT INTO Customer (first_name, last_name, email, phone, address, customer_type) VALUES (?, ?, ?, ?, ?, ?)';
        await pool.query(sql, [
            first_name.trim(),
            last_name && last_name.trim() !== '' ? last_name.trim() : null,
            email && email.trim() !== '' ? email.trim() : null,
            phone && phone.trim() !== '' ? phone.trim() : null,
            address && address.trim() !== '' ? address.trim() : null,
            customer_type || 'retail' // Default to 'retail' if not provided
        ]);
        res.redirect('/customer?success_msg=Customer added successfully!');
    } catch (err) {
        console.error('Error adding customer:', err);
        let error_message = 'Failed to add customer.';
        if (err.code === 'ER_DUP_ENTRY') { // For unique email constraint
            error_message = 'A customer with this email already exists.';
        }
        res.render('customer/form', { // Re-render form with error
            title: 'Add New Customer',
            customer: {},
            action: '/customer/add',
            submitButtonText: 'Add Customer',
            error_msg: error_message,
            form_data: req.body
        });
    }
});

// GET: Show form to edit an existing customer
router.get('/edit/:customerId', async (req, res) => {
    const customerId = req.params.customerId;
    try {
        const [customerResult] = await pool.query('SELECT * FROM Customer WHERE customer_id = ?', [customerId]);
        if (customerResult.length === 0) {
            return res.status(404).render('error', { title: 'Customer Not Found', message: 'Customer not found.' });
        }
        const customerToEdit = customerResult[0];
        res.render('customer/form', {
            title: `Edit Customer: ${customerToEdit.first_name} ${customerToEdit.last_name || ''}`,
            customer: customerToEdit, // Pass fetched customer data
            action: `/customer/edit/${customerId}`,
            submitButtonText: 'Update Customer',
            error_msg: req.query.error_msg,
            form_data: {} // No conflicting form data on initial GET
        });
    } catch (err) {
        console.error(`Error loading edit form for customer ID ${customerId}:`, err);
        res.status(500).render('error', { title: 'Server Error', message: 'Could not load customer edit form.' });
    }
});

// POST: Process updating an existing customer
router.post('/edit/:customerId', async (req, res) => {
    const customerId = req.params.customerId;
    const { first_name, last_name, email, phone, address, customer_type } = req.body;
    let errors = [];

    if (!first_name || first_name.trim() === '') {
        errors.push('First Name is required.');
    }
    if (email && email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(email.trim())) {
        errors.push('Please enter a valid email address.');
    }
    // Add more validation

    if (errors.length > 0) {
        // Re-render form with errors and current data
        return res.render('customer/form', {
            title: `Edit Customer: ${first_name || '(Validation Error)'}`,
            customer: { customer_id: customerId, ...req.body }, // Pass ID and current form data
            action: `/customer/edit/${customerId}`,
            submitButtonText: 'Update Customer',
            error_msg: errors.join(' '),
            form_data: req.body
        });
    }

    try {
        const sql = `UPDATE Customer SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, customer_type = ?
                     WHERE customer_id = ?`;
        const [result] = await pool.query(sql, [
            first_name.trim(),
            last_name && last_name.trim() !== '' ? last_name.trim() : null,
            email && email.trim() !== '' ? email.trim() : null,
            phone && phone.trim() !== '' ? phone.trim() : null,
            address && address.trim() !== '' ? address.trim() : null,
            customer_type || 'retail',
            customerId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).render('error', { title: 'Update Failed', message: 'Customer to update not found.' });
        }
        res.redirect('/customer?success_msg=Customer updated successfully!');
    } catch (err) {
        console.error(`Error updating customer ID ${customerId}:`, err);
        let error_message = 'Failed to update customer.';
        if (err.code === 'ER_DUP_ENTRY') {
            error_message = 'A customer with this email already exists.';
        }
        res.render('customer/form', { // Re-render form with DB error
            title: `Edit Customer: ${first_name || '(DB Error)'}`,
            customer: { customer_id: customerId, ...req.body },
            action: `/customer/edit/${customerId}`,
            submitButtonText: 'Update Customer',
            error_msg: error_message,
            form_data: req.body
        });
    }
});

// POST: Process deleting a customer
router.post('/delete/:customerId', async (req, res) => {
    const customerId = req.params.customerId;
    try {
        // Your Sales.customer_id has ON DELETE SET NULL, so sales records will not be deleted,
        // but their customer_id will become NULL. This is generally acceptable.
        // If you had other critical dependencies with ON DELETE RESTRICT, you'd check them here.
        const [result] = await pool.query('DELETE FROM Customer WHERE customer_id = ?', [customerId]);
        if (result.affectedRows === 0) {
            return res.redirect(`/customer?error_msg=Customer not found or already deleted.`);
        }
        res.redirect('/customer?success_msg=Customer deleted successfully!');
    } catch (err) {
        console.error(`Error deleting customer ID ${customerId}:`, err);
        // A general error, as FK constraint should allow deletion by setting Sales.customer_id to NULL
        res.redirect(`/customer?error_msg=Failed to delete customer due to a server error.`);
    }
});

module.exports = router;