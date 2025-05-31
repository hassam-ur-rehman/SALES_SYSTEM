// dbms project 2.0/routes/items.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET: Display all items
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT
                i.item_id, i.item_name, i.sku, i.retail_price, i.stock_quantity,
                c.category_name, s.supplier_name
            FROM Items i
            LEFT JOIN Categories c ON i.category_id = c.category_id
            LEFT JOIN Suppliers s ON i.supplier_id = s.supplier_id
            ORDER BY i.item_name ASC
        `;
        let [itemsList] = await pool.query(query);

        itemsList = itemsList.map(item => ({
            ...item,
            retail_price: item.retail_price === null ? null : parseFloat(item.retail_price)
        }));

        res.render('items/list', {
            title: 'Manage Items',
            items: itemsList,
            success_msg: req.query.success_msg,
            error_msg: req.query.error_msg
        });
    } catch (err) {
        console.error('Error fetching items from database OR processing items:', err);
        res.status(500).render('error', {
            title: 'Application Error',
            message: 'Could not retrieve or process items. Please try again later.'
        });
    }
});

// GET: Show form to add a new item
router.get('/add', async (req, res) => {
    const currentPathForReturnTo = '/items/add';
    try {
        const [categories] = await pool.query('SELECT category_id, category_name FROM Categories ORDER BY category_name ASC');
        const [suppliers] = await pool.query('SELECT supplier_id, supplier_name FROM Suppliers ORDER BY supplier_name ASC');
        res.render('items/form', {
            title: 'Add New Item',
            item: {},
            categories: categories,
            suppliers: suppliers,
            action: '/items/add',
            submitButtonText: 'Add Item',
            error_msg: req.query.error_msg,
            form_data: req.query.form_data ? JSON.parse(req.query.form_data) : {},
            success_msg_cat: req.query.success_msg_cat,
            success_msg_sup: req.query.success_msg_sup,
            currentPath: currentPathForReturnTo
        });
    } catch (err) {
        console.error("Error loading add item form:", err);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Could not load the form to add a new item.'
        });
    }
});

// POST: Process adding a new item
router.post('/add', async (req, res) => {
    const {
        item_name, sku, description, category_id, supplier_id,
        purchase_price, retail_price, wholesale_price,
        stock_quantity, reorder_level
    } = req.body;

    let errors = [];
    if (!item_name || item_name.trim() === '') { errors.push('Item Name is required.'); }
    if (retail_price === '' || isNaN(parseFloat(retail_price)) || parseFloat(retail_price) < 0) { errors.push('Valid Retail Price is required.'); }
    if (stock_quantity === '' || isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0) { errors.push('Valid Stock Quantity is required.'); }

    if (errors.length > 0) {
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        return res.redirect(`/items/add?error_msg=${encodeURIComponent(errors.join(' '))}&form_data=${formDataQuery}`);
    }

    const sql = `INSERT INTO Items (item_name, sku, description, category_id, supplier_id, purchase_price, retail_price, wholesale_price, stock_quantity, reorder_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
        await pool.query(sql, [
            item_name.trim(),
            sku && sku.trim() !== '' ? sku.trim() : null,
            description && description.trim() !== '' ? description.trim() : null,
            category_id || null,
            supplier_id || null,
            purchase_price && purchase_price !== '' ? parseFloat(purchase_price) : null,
            parseFloat(retail_price),
            wholesale_price && wholesale_price !== '' ? parseFloat(wholesale_price) : null,
            parseInt(stock_quantity),
            reorder_level && reorder_level !== '' ? parseInt(reorder_level) : 0
        ]);
        res.redirect('/items?success_msg=Item added successfully!');
    } catch (dbErr) {
        console.error("Error adding item to database:", dbErr);
        let db_error_message = 'Failed to add item to database. Please try again.';
        if (dbErr.code === 'ER_DUP_ENTRY') {
            db_error_message = 'Failed to add item: An item with this SKU already exists.';
        }
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        res.redirect(`/items/add?error_msg=${encodeURIComponent(db_error_message)}&form_data=${formDataQuery}`);
    }
});


// GET: Show form to edit an existing item
router.get('/edit/:itemId', async (req, res) => {
    const itemId = req.params.itemId;
    const currentPathForReturnTo = `/items/edit/${itemId}`;

    try {
        const [itemResult] = await pool.query('SELECT * FROM Items WHERE item_id = ?', [itemId]);

        if (itemResult.length === 0) {
            return res.status(404).render('error', {
                title: 'Item Not Found',
                message: 'The item you are trying to edit does not exist.'
            });
        }
        let itemToEdit = itemResult[0];

        const previousFormData = req.query.form_data ? JSON.parse(req.query.form_data) : null;
        if (previousFormData) {
            itemToEdit = { ...itemToEdit, ...previousFormData };
        } else {
            itemToEdit.purchase_price = itemToEdit.purchase_price === null ? '' : parseFloat(itemToEdit.purchase_price);
            itemToEdit.retail_price = itemToEdit.retail_price === null ? '' : parseFloat(itemToEdit.retail_price);
            itemToEdit.wholesale_price = itemToEdit.wholesale_price === null ? '' : parseFloat(itemToEdit.wholesale_price);
        }

        const [categories] = await pool.query('SELECT category_id, category_name FROM Categories ORDER BY category_name ASC');
        const [suppliers] = await pool.query('SELECT supplier_id, supplier_name FROM Suppliers ORDER BY supplier_name ASC');

        res.render('items/form', {
            title: `Edit Item: ${itemToEdit.item_name || 'Item'}`,
            item: itemToEdit,
            categories: categories,
            suppliers: suppliers,
            action: `/items/edit/${itemId}`,
            submitButtonText: 'Update Item',
            error_msg: req.query.error_msg,
            form_data: previousFormData || {},
            success_msg_cat: req.query.success_msg_cat,
            success_msg_sup: req.query.success_msg_sup,
            currentPath: currentPathForReturnTo
        });
    } catch (err) {
        console.error(`Error loading edit form for item ID ${itemId}:`, err);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Could not load the form to edit the item.'
        });
    }
});

// POST: Process updating an existing item
router.post('/edit/:itemId', async (req, res) => {
    const itemId = req.params.itemId;
    const {
        item_name, sku, description, category_id, supplier_id,
        purchase_price, retail_price, wholesale_price,
        stock_quantity, reorder_level
    } = req.body;

    let errors = [];
    if (!item_name || item_name.trim() === '') { errors.push('Item Name is required.'); }
    if (retail_price === '' || isNaN(parseFloat(retail_price)) || parseFloat(retail_price) < 0) { errors.push('Valid Retail Price is required.'); }
    if (stock_quantity === '' || isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0) { errors.push('Valid Stock Quantity is required.'); }

    if (errors.length > 0) {
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        return res.redirect(`/items/edit/${itemId}?error_msg=${encodeURIComponent(errors.join(' '))}&form_data=${formDataQuery}`);
    }

    const sql = `UPDATE Items SET
                 item_name = ?, sku = ?, description = ?, category_id = ?, supplier_id = ?,
                 purchase_price = ?, retail_price = ?, wholesale_price = ?,
                 stock_quantity = ?, reorder_level = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE item_id = ?`;
    try {
        const [result] = await pool.query(sql, [
            item_name.trim(),
            sku && sku.trim() !== '' ? sku.trim() : null,
            description && description.trim() !== '' ? description.trim() : null,
            category_id === '' ? null : category_id,
            supplier_id === '' ? null : supplier_id,
            purchase_price && purchase_price !== '' ? parseFloat(purchase_price) : null,
            parseFloat(retail_price),
            wholesale_price && wholesale_price !== '' ? parseFloat(wholesale_price) : null,
            parseInt(stock_quantity),
            reorder_level && reorder_level !== '' ? parseInt(reorder_level) : 0,
            itemId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).render('error', {
                title: 'Update Failed',
                message: 'Item to update was not found. It might have been deleted.'
            });
        }
        res.redirect('/items?success_msg=Item updated successfully!');
    } catch (dbErr) {
        console.error(`Error updating item ID ${itemId} in database:`, dbErr);
        let db_error_message = 'Failed to update item. Please try again.';
        if (dbErr.code === 'ER_DUP_ENTRY') {
            db_error_message = 'Failed to update item: An item with this SKU already exists (and it is not this item).';
        }
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        res.redirect(`/items/edit/${itemId}?error_msg=${encodeURIComponent(db_error_message)}&form_data=${formDataQuery}`);
    }
});


// --- ADDED/REVERTED DELETE ITEM ROUTE ---
router.post('/delete/:itemId', async (req, res) => {
    const itemId = req.params.itemId;
    let itemNameForMessage = `Item ID ${itemId}`; // Default message

    try {
        // Optional: Fetch item name for better messages.
        const [itemInfo] = await pool.query('SELECT item_name FROM Items WHERE item_id = ?', [itemId]);
        if (itemInfo.length > 0) {
            itemNameForMessage = `"${itemInfo[0].item_name}"`;
        }

        // Attempt to delete the item
        const [result] = await pool.query('DELETE FROM Items WHERE item_id = ?', [itemId]);

        if (result.affectedRows > 0) {
            res.redirect(`/items?success_msg=Item ${itemNameForMessage} deleted successfully.`);
        } else {
            // Item ID was not found in the database
            res.redirect(`/items?error_msg=Could not delete item ${itemNameForMessage}. Item not found.`);
        }
    } catch (err) {
        // Log the full error to the server console for debugging
        console.error(`Error deleting item ID ${itemId}: Code [${err.code || 'N/A'}] Message [${err.sqlMessage || err.message}] Full Error:`, err);

        let userErrorMessage = `Could not delete item ${itemNameForMessage}. An unexpected error occurred.`;
        // Specifically handle foreign key constraint violations
        if (err.code === 'ER_ROW_IS_REFERENCED_2') { // This is a common MySQL error code for FK violations
            userErrorMessage = `Cannot delete item ${itemNameForMessage}. It is referenced in other records (e.g., existing sales or purchase orders). Please remove those references first or mark the item as inactive/discontinued instead of deleting.`;
        }
        
        res.redirect(`/items?error_msg=${encodeURIComponent(userErrorMessage)}`);
    }
});


module.exports = router;