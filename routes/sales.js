// dbms project 2.0/routes/sales.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET: Display all sales
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT s.sale_id, s.sale_date, s.sale_type, s.total_amount, s.payment_method,
                   CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
                   u.username AS user_username
            FROM Sales s
            LEFT JOIN Customer c ON s.customer_id = c.customer_id
            JOIN Users u ON s.user_id = u.user_id
            ORDER BY s.sale_date DESC, s.sale_id DESC
        `;
        const [sales] = await pool.query(query);
        const processedSales = sales.map(sale => ({
            ...sale,
            total_amount: sale.total_amount === null ? 0.00 : parseFloat(sale.total_amount)
        }));
        res.render('sales/list', {
            title: 'Manage Sales', sales: processedSales,
            success_msg: req.query.success_msg, error_msg: req.query.error_msg
        });
    } catch (err) {
        console.error('Error fetching sales:', err);
        res.status(500).render('error', { title: 'Database Error', message: 'Could not retrieve sales records.' });
    }
});

// GET: Show form to add a new sale
router.get('/add', async (req, res) => {
    try {
        const [customers] = await pool.query('SELECT customer_id, first_name, last_name FROM Customer ORDER BY last_name, first_name');
        const [users] = await pool.query('SELECT user_id, username, full_name FROM Users WHERE is_active = TRUE ORDER BY username');
        const [items] = await pool.query('SELECT item_id, item_name, sku, retail_price, wholesale_price, stock_quantity FROM Items WHERE stock_quantity > 0 ORDER BY item_name');

        res.render('sales/form', {
            title: 'Create New Sale',
            sale: {},
            customers: customers,
            users: users,
            itemsForSale: items,
            action: '/sales/add',
            submitButtonText: 'Record Sale',
            error_msg: req.query.error_msg,
            form_data: req.query.form_data ? JSON.parse(req.query.form_data) : {},
            currentPath: '/sales/add'
        });
    } catch (err) {
        console.error('Error loading new sale form:', err);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Could not load the new sale form.'
        });
    }
});

// POST: Process adding a new sale
router.post('/add', async (req, res) => {
    const {
        customer_id,
        user_id,
        sale_type,
        payment_method,
        notes
    } = req.body;

    console.log('Full Received Sale Submission (req.body):', req.body);

    const reconstructed_sale_items = [];
    let i = 0;
    while (req.body[`sale_items[${i}][item_id]`] !== undefined) {
        reconstructed_sale_items.push({
            item_id: req.body[`sale_items[${i}][item_id]`],
            quantity_sold: req.body[`sale_items[${i}][quantity_sold]`],
            unit_price_at_sale: req.body[`sale_items[${i}][unit_price_at_sale]`],
            subtotal: req.body[`sale_items[${i}][subtotal]`]
        });
        i++;
    }
    console.log('Manually Reconstructed Sale Items:', reconstructed_sale_items);

    let errors = [];
    if (!user_id) { errors.push('Processing User is required.'); }
    if (!sale_type) { errors.push('Sale Type is required.'); }

    if (!reconstructed_sale_items || reconstructed_sale_items.length === 0) {
        errors.push('At least one item must be added to the sale.');
    } else {
        reconstructed_sale_items.forEach((item, index) => {
            if (!item.item_id || isNaN(parseInt(item.item_id))) { errors.push(`Item ${index + 1}: Invalid Item ID.`); }
            if (!item.quantity_sold || isNaN(parseInt(item.quantity_sold)) || parseInt(item.quantity_sold) <= 0) { errors.push(`Item ${index + 1}: Invalid quantity.`); }
            if (!item.unit_price_at_sale || isNaN(parseFloat(item.unit_price_at_sale)) || parseFloat(item.unit_price_at_sale) < 0) { errors.push(`Item ${index + 1}: Invalid unit price.`); }
        });
    }

    if (errors.length > 0) {
        const mainFormData = { customer_id, user_id, sale_type, payment_method, notes };
        const formDataQuery = encodeURIComponent(JSON.stringify(mainFormData));
        return res.redirect(`/sales/add?error_msg=${encodeURIComponent(errors.join(' '))}&form_data=${formDataQuery}`);
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let calculatedTotalAmount = 0;
        if (reconstructed_sale_items.length > 0) {
            for (const item of reconstructed_sale_items) {
                const quantity = parseInt(item.quantity_sold);
                const unit_price = parseFloat(item.unit_price_at_sale);
                if (!isNaN(quantity) && !isNaN(unit_price)) {
                    calculatedTotalAmount += quantity * unit_price;
                } else {
                    throw new Error(`Invalid numeric data for item: ID ${item.item_id}, Qty: ${item.quantity_sold}, Price: ${item.unit_price_at_sale}`);
                }
            }
        }
        
        const salesInsertSql = `
            INSERT INTO Sales (customer_id, user_id, sale_type, payment_method, notes, total_amount, sale_date)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        const [salesResult] = await connection.query(salesInsertSql, [
            customer_id === '' ? null : customer_id,
            user_id,
            sale_type,
            payment_method || null,
            notes || null,
            calculatedTotalAmount.toFixed(2)
        ]);
        const saleId = salesResult.insertId;

        if (reconstructed_sale_items.length > 0) {
            for (const item of reconstructed_sale_items) {
                const itemId = parseInt(item.item_id);
                const quantitySold = parseInt(item.quantity_sold);
                const unitPriceAtSale = parseFloat(item.unit_price_at_sale);
                const subtotal = (quantitySold * unitPriceAtSale).toFixed(2);

                const [itemStockCheck] = await connection.query('SELECT stock_quantity, item_name FROM Items WHERE item_id = ?', [itemId]);
                if (itemStockCheck.length === 0) {
                    throw new Error(`Item with ID ${itemId} not found. Sale rolled back.`);
                }
                if (itemStockCheck[0].stock_quantity < quantitySold) {
                    throw new Error(`Insufficient stock for item '${itemStockCheck[0].item_name}' (ID ${itemId}). Requested ${quantitySold}, available ${itemStockCheck[0].stock_quantity}. Sale rolled back.`);
                }

                const saleItemSql = `
                    INSERT INTO Sale_Items (sale_id, item_id, quantity_sold, unit_price_at_sale, subtotal)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await connection.query(saleItemSql, [saleId, itemId, quantitySold, unitPriceAtSale, subtotal]);
            }
        }

        await connection.commit();
        res.redirect(`/sales?success_msg=Sale (ID: ${saleId}) recorded successfully!`);

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error recording sale transaction:', err);
        
        const mainFormData = { customer_id, user_id, sale_type, payment_method, notes };
        const formDataQuery = encodeURIComponent(JSON.stringify(mainFormData));
        const sanitizedError = err.message ? err.message.replace(/[^a-zA-Z0-9 .,:;!?'()_-]/g, " ") : "An unexpected error occurred.";
        res.redirect(`/sales/add?error_msg=Error recording sale: ${encodeURIComponent(sanitizedError)}&form_data=${formDataQuery}`);
    } finally {
        if (connection) connection.release();
    }
});


// --- START: NEW/UPDATED CODE for GET /sales/view/:saleId ---
// This replaces the placeholder: router.get('/view/:saleId', async (req, res) => { ... });
router.get('/view/:saleId', async (req, res) => {
    const saleId = req.params.saleId;
    try {
        // Query 1: Get the main sale details
        const saleDetailsQuery = `
            SELECT
                s.sale_id,
                s.sale_date,
                s.sale_type,
                s.total_amount,
                s.payment_method,
                s.notes,
                c.customer_id,
                CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone,
                u.user_id,
                u.username AS user_username, /* Kept for consistency with list view if needed */
                u.full_name AS user_full_name /* Prefer full_name if available */
            FROM Sales s
            LEFT JOIN Customer c ON s.customer_id = c.customer_id
            JOIN Users u ON s.user_id = u.user_id
            WHERE s.sale_id = ?
        `;
        const [saleRows] = await pool.query(saleDetailsQuery, [saleId]);

        if (saleRows.length === 0) {
            return res.status(404).render('error', {
                title: 'Sale Not Found',
                message: 'The requested sale could not be found.'
            });
        }
        const saleDetails = saleRows[0];
        // Ensure total_amount is a number for display formatting in EJS
        saleDetails.total_amount = parseFloat(saleDetails.total_amount);


        // Query 2: Get the items associated with this sale
        const saleItemsQuery = `
            SELECT
                si.sale_item_id,
                si.quantity_sold,
                si.unit_price_at_sale,
                si.subtotal,
                i.item_id,
                i.item_name,
                i.sku
            FROM Sale_Items si
            JOIN Items i ON si.item_id = i.item_id
            WHERE si.sale_id = ?
            ORDER BY i.item_name ASC
        `;
        const [itemsSold] = await pool.query(saleItemsQuery, [saleId]);

        // Ensure numeric values from sale_items are numbers for display formatting
        const processedItemsSold = itemsSold.map(item => ({
            ...item,
            unit_price_at_sale: parseFloat(item.unit_price_at_sale),
            subtotal: parseFloat(item.subtotal)
        }));

        res.render('sales/details', { // Assumes views/sales/details.ejs exists
            title: `Sale Details - ID: ${saleDetails.sale_id}`,
            sale: saleDetails,
            items: processedItemsSold
        });

    } catch (err) {
        console.error(`Error fetching details for sale ID ${saleId}:`, err);
        res.status(500).render('error', {
            title: 'Database Error',
            message: 'Could not retrieve sale details.'
        });
    }
});
// --- END: NEW/UPDATED CODE for GET /sales/view/:saleId ---

module.exports = router;