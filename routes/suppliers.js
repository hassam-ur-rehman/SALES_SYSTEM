// dbms project 2.0/routes/suppliers.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('../middleware/authMiddleware'); // Assuming this path is correct

// Apply isAuthenticated middleware to all routes in this file
router.use(isAuthenticated);

// GET: Display all suppliers
router.get('/', async (req, res) => {
    try {
        const [allSuppliers] = await pool.query('SELECT * FROM Suppliers ORDER BY supplier_name ASC');
        res.render('suppliers/list', {
            title: 'Manage Suppliers',
            suppliers: allSuppliers,
            success_msg: req.query.success_msg,
            error_msg: req.query.error_msg
        });
    } catch (err) {
        console.error("Error fetching suppliers:", err);
        res.status(500).render('error', { title: 'Database Error', message: 'Could not retrieve suppliers.' });
    }
});

// GET: Show form to add a new supplier
router.get('/add', (req, res) => {
    const currentPathForReturnTo = `/items${req.query.from === 'items' ? (req.query.itemId ? `/edit/${req.query.itemId}` : '/add') : '/add'}`; // Simplified
    const returnTo = req.query.returnTo || currentPathForReturnTo;

    res.render('suppliers/form', {
        title: 'Add New Supplier',
        supplier: {}, // Empty for add
        action: `/suppliers/add${returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : ''}`,
        submitButtonText: 'Add Supplier',
        error_msg: req.query.error_msg,
        form_data: req.query.form_data ? JSON.parse(req.query.form_data) : {},
        currentPath: returnTo // For cancel link and consistency
    });
});

// POST: Process adding a new supplier
router.post('/add', async (req, res) => {
    const { supplier_name, contact_person, email, phone, address } = req.body;
    const returnTo = req.query.returnTo;

    let errors = [];
    if (!supplier_name || supplier_name.trim() === '') { errors.push('Supplier Name is required.'); }
    if (email && email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { errors.push('Please enter a valid email address.');}
    // Add other validations as needed

    if (errors.length > 0) {
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        let redirectUrl = `/suppliers/add?error_msg=${encodeURIComponent(errors.join(' '))}&form_data=${formDataQuery}`;
        if (returnTo) redirectUrl += `&returnTo=${encodeURIComponent(returnTo)}`;
        return res.redirect(redirectUrl);
    }

    try {
        await pool.query('INSERT INTO Suppliers (supplier_name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
            [supplier_name.trim(), contact_person || null, email || null, phone || null, address || null]);

        if (returnTo && (returnTo.startsWith('/items/add') || returnTo.startsWith('/items/edit'))) {
            return res.redirect(`${returnTo}?success_msg_sup=Supplier '${supplier_name.trim()}' added. Please re-select from dropdown or refresh.`);
        }
        res.redirect('/suppliers?success_msg=Supplier added successfully!');
    } catch (dbErr) {
        console.error("Error adding supplier:", dbErr);
        let db_error_message = 'Failed to add supplier.';
        if (dbErr.code === 'ER_DUP_ENTRY') { db_error_message = 'A supplier with this name or email already exists.'; }
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        let redirectUrl = `/suppliers/add?error_msg=${encodeURIComponent(db_error_message)}&form_data=${formDataQuery}`;
        if (returnTo) redirectUrl += `&returnTo=${encodeURIComponent(returnTo)}`;
        res.redirect(redirectUrl);
    }
});

// GET: Show form to edit an existing supplier
router.get('/edit/:supplierId', async (req, res) => {
    const supplierId = req.params.supplierId;
    try {
        const [supResult] = await pool.query('SELECT * FROM Suppliers WHERE supplier_id = ?', [supplierId]);
        if (supResult.length === 0) {
            return res.status(404).render('error', { title: 'Supplier Not Found', message: 'Supplier not found.' });
        }
        let supplierToEdit = supResult[0];
        const previousFormData = req.query.form_data ? JSON.parse(req.query.form_data) : null;
        if (previousFormData) { // If redirected from failed POST, use that data
            supplierToEdit = { ...supplierToEdit, ...previousFormData };
        }

        res.render('suppliers/form', {
            title: `Edit Supplier: ${supplierToEdit.supplier_name}`,
            supplier: supplierToEdit, // This now contains DB data or previous form data
            action: `/suppliers/edit/${supplierId}`,
            submitButtonText: 'Update Supplier',
            error_msg: req.query.error_msg,
            form_data: previousFormData || {}, // For consistency if view uses it, though 'supplier' has merged data
            currentPath: `/suppliers/edit/${supplierId}` // For "(+ Add New)" if you had them here
        });
    } catch (err) {
        console.error(`Error loading edit form for supplier ID ${supplierId}:`, err);
        res.status(500).render('error', { title: 'Server Error', message: 'Could not load supplier edit form.' });
    }
});

// POST: Process updating an existing supplier
router.post('/edit/:supplierId', async (req, res) => {
    const supplierId = req.params.supplierId;
    const { supplier_name, contact_person, email, phone, address } = req.body;

    let errors = [];
    if (!supplier_name || supplier_name.trim() === '') { errors.push('Supplier Name is required.'); }
    if (email && email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { errors.push('Please enter a valid email address.');}
    // Add other validations

    if (errors.length > 0) {
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        return res.redirect(`/suppliers/edit/${supplierId}?error_msg=${encodeURIComponent(errors.join(' '))}&form_data=${formDataQuery}`);
    }

    const sql = `UPDATE Suppliers SET supplier_name = ?, contact_person = ?, email = ?, phone = ?, address = ?
                 WHERE supplier_id = ?`;
    try {
        const [result] = await pool.query(sql, [
            supplier_name.trim(),
            contact_person || null,
            email || null,
            phone || null,
            address || null,
            supplierId
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).render('error', { title: 'Update Failed', message: 'Supplier to update not found.'});
        }
        res.redirect('/suppliers?success_msg=Supplier updated successfully!');
    } catch (dbErr) {
        console.error(`Error updating supplier ID ${supplierId}:`, dbErr);
        let db_error_message = 'Failed to update supplier.';
        if (dbErr.code === 'ER_DUP_ENTRY') { db_error_message = 'Failed to update supplier: A supplier with this name or email already exists.'; }
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        res.redirect(`/suppliers/edit/${supplierId}?error_msg=${encodeURIComponent(db_error_message)}&form_data=${formDataQuery}`);
    }
});

// POST: Delete a supplier
router.post('/delete/:supplierId', async (req, res) => {
    const supplierId = req.params.supplierId;
    let supplierNameForMessage = `Supplier ID ${supplierId}`;
    try {
        const [supInfo] = await pool.query('SELECT supplier_name FROM Suppliers WHERE supplier_id = ?', [supplierId]);
        if (supInfo.length > 0) {
            supplierNameForMessage = `"${supInfo[0].supplier_name}"`;
        }

        // Check for references in Purchase_Orders (ON DELETE RESTRICT)
        const [poCheck] = await pool.query('SELECT 1 FROM Purchase_Orders WHERE supplier_id = ? LIMIT 1', [supplierId]);
        if (poCheck.length > 0) {
            return res.redirect(`/suppliers?error_msg=${encodeURIComponent(`Cannot delete supplier ${supplierNameForMessage}. It is referenced in Purchase Orders.`)}`);
        }
        // Items.supplier_id is ON DELETE SET NULL, so that's fine.

        const [result] = await pool.query('DELETE FROM Suppliers WHERE supplier_id = ?', [supplierId]);
        if (result.affectedRows > 0) {
            res.redirect(`/suppliers?success_msg=Supplier ${supplierNameForMessage} deleted. Associated items now have no supplier.`);
        } else {
            res.redirect(`/suppliers?error_msg=Could not delete supplier ${supplierNameForMessage}. Supplier not found.`);
        }
    } catch (err) {
        console.error(`Error deleting supplier ID ${supplierId}:`, err);
        let userErrorMessage = `Could not delete supplier ${supplierNameForMessage}. An unexpected error occurred.`;
        // err.code for specific FK might differ if it's not ER_ROW_IS_REFERENCED_2 for POs
        if (err.message.includes("foreign key constraint fails")) { // More generic check
             userErrorMessage = `Cannot delete supplier ${supplierNameForMessage}. It is referenced in other records.`;
        }
        res.redirect(`/suppliers?error_msg=${encodeURIComponent(userErrorMessage)}`);
    }
});

module.exports = router;