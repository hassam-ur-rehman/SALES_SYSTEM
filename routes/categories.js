// dbms project 2.0/routes/categories.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.use(isAuthenticated);

// GET: Display all categories
router.get('/', async (req, res) => {
    try {
        const [allCategories] = await pool.query('SELECT * FROM Categories ORDER BY category_name ASC');
        res.render('categories/list', {
            title: 'Manage Categories',
            categories: allCategories,
            success_msg: req.query.success_msg,
            error_msg: req.query.error_msg
        });
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).render('error', { title: 'Database Error', message: 'Could not retrieve categories.' });
    }
});

// GET: Show form to add a new category
router.get('/add', (req, res) => {
    const returnTo = req.query.returnTo || '/categories'; // Default return or from query
    res.render('categories/form', {
        title: 'Add New Category',
        category: {},
        action: `/categories/add${returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : ''}`,
        submitButtonText: 'Add Category',
        error_msg: req.query.error_msg,
        form_data: req.query.form_data ? JSON.parse(req.query.form_data) : {},
        currentPath: returnTo // For cancel link
    });
});

// POST: Process adding a new category
router.post('/add', async (req, res) => {
    const { category_name, description } = req.body;
    const returnTo = req.query.returnTo;

    if (!category_name || category_name.trim() === '') {
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        let redirectUrl = `/categories/add?error_msg=${encodeURIComponent('Category Name is required.')}&form_data=${formDataQuery}`;
        if (returnTo) redirectUrl += `&returnTo=${encodeURIComponent(returnTo)}`;
        return res.redirect(redirectUrl);
    }

    try {
        await pool.query('INSERT INTO Categories (category_name, description) VALUES (?, ?)',
            [category_name.trim(), description || null]);

        if (returnTo && (returnTo.startsWith('/items/add') || returnTo.startsWith('/items/edit'))) {
            return res.redirect(`${returnTo}?success_msg_cat=Category '${category_name.trim()}' added. Please re-select or refresh.`);
        }
        res.redirect('/categories?success_msg=Category added successfully!');
    } catch (dbErr) {
        console.error("Error adding category:", dbErr);
        let db_error_message = 'Failed to add category.';
        if (dbErr.code === 'ER_DUP_ENTRY') { db_error_message = 'A category with this name already exists.'; }
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        let redirectUrl = `/categories/add?error_msg=${encodeURIComponent(db_error_message)}&form_data=${formDataQuery}`;
        if (returnTo) redirectUrl += `&returnTo=${encodeURIComponent(returnTo)}`;
        res.redirect(redirectUrl);
    }
});

// GET: Show form to edit an existing category
router.get('/edit/:categoryId', async (req, res) => {
    const categoryId = req.params.categoryId;
    try {
        const [catResult] = await pool.query('SELECT * FROM Categories WHERE category_id = ?', [categoryId]);
        if (catResult.length === 0) {
            return res.status(404).render('error', { title: 'Category Not Found', message: 'Category not found.' });
        }
        let categoryToEdit = catResult[0];
        const previousFormData = req.query.form_data ? JSON.parse(req.query.form_data) : null;
        if (previousFormData) {
            categoryToEdit = { ...categoryToEdit, ...previousFormData };
        }

        res.render('categories/form', {
            title: `Edit Category: ${categoryToEdit.category_name}`,
            category: categoryToEdit,
            action: `/categories/edit/${categoryId}`,
            submitButtonText: 'Update Category',
            error_msg: req.query.error_msg,
            form_data: previousFormData || {},
            currentPath: `/categories/edit/${categoryId}`
        });
    } catch (err) {
        console.error(`Error loading edit form for category ID ${categoryId}:`, err);
        res.status(500).render('error', { title: 'Server Error', message: 'Could not load category edit form.' });
    }
});

// POST: Process updating an existing category
router.post('/edit/:categoryId', async (req, res) => {
    const categoryId = req.params.categoryId;
    const { category_name, description } = req.body;

    if (!category_name || category_name.trim() === '') {
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        return res.redirect(`/categories/edit/${categoryId}?error_msg=${encodeURIComponent('Category Name is required.')}&form_data=${formDataQuery}`);
    }

    const sql = `UPDATE Categories SET category_name = ?, description = ? WHERE category_id = ?`;
    try {
        const [result] = await pool.query(sql, [category_name.trim(), description || null, categoryId]);
        if (result.affectedRows === 0) {
            return res.status(404).render('error', { title: 'Update Failed', message: 'Category to update not found.'});
        }
        res.redirect('/categories?success_msg=Category updated successfully!');
    } catch (dbErr) {
        console.error(`Error updating category ID ${categoryId}:`, dbErr);
        let db_error_message = 'Failed to update category.';
        if (dbErr.code === 'ER_DUP_ENTRY') { db_error_message = 'A category with this name already exists.'; }
        const formDataQuery = encodeURIComponent(JSON.stringify(req.body));
        res.redirect(`/categories/edit/${categoryId}?error_msg=${encodeURIComponent(db_error_message)}&form_data=${formDataQuery}`);
    }
});

// POST: Delete a category
router.post('/delete/:categoryId', async (req, res) => {
    const categoryId = req.params.categoryId;
    let categoryNameForMessage = `Category ID ${categoryId}`;
    try {
        const [catInfo] = await pool.query('SELECT category_name FROM Categories WHERE category_id = ?', [categoryId]);
        if (catInfo.length > 0) {
            categoryNameForMessage = `"${catInfo[0].category_name}"`;
        }
        // Items.category_id is ON DELETE SET NULL, so deletion is "safe" regarding items.
        const [result] = await pool.query('DELETE FROM Categories WHERE category_id = ?', [categoryId]);
        if (result.affectedRows > 0) {
            res.redirect(`/categories?success_msg=Category ${categoryNameForMessage} deleted. Associated items will now have no category.`);
        } else {
            res.redirect(`/categories?error_msg=Could not delete category ${categoryNameForMessage}. Category not found.`);
        }
    } catch (err) {
        console.error(`Error deleting category ID ${categoryId}:`, err);
         // Since ON DELETE SET NULL is used for Items, direct FK errors during delete are less likely.
        res.redirect(`/categories?error_msg=${encodeURIComponent(`Could not delete category ${categoryNameForMessage}. Error: ${err.message}`)}`);
    }
});

module.exports = router;