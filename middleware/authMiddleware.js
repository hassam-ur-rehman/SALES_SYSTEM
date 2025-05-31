// dbms project 2.0/middleware/authMiddleware.js
module.exports.isAuthenticated = (req, res, next) => {
    console.log('isAuthenticated Middleware - req.session.user:', JSON.stringify(req.session.user)); // LOG THIS
    if (req.session.user && req.session.user.userId) { // Check if user object and userId exist in session
        return next(); // User is logged in, proceed to the next middleware or route handler
    }
    // User is not logged in
    req.session.returnTo = req.originalUrl; // Optional: Store the URL they were trying to access
    res.redirect('/auth/login?error_msg=You must be logged in to view that page.');
};

module.exports.hasRole = (requiredRoles) => {
    return (req, res, next) => {
        console.log('hasRole Middleware - req.session.user:', JSON.stringify(req.session.user)); // LOG THIS
        if (!req.session.user || !req.session.user.userId) { // First, ensure they are authenticated
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login?error_msg=Please log in to continue.');
        }

        const userRole = req.session.user.role;
        const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        if (rolesToCheck.includes(userRole)) {
            return next(); // User has one of the required roles
        } else {
            // User does not have the required role
            console.log(`Access Denied for user ${req.session.user.username} (role: ${userRole}). Required roles: ${rolesToCheck.join(', ')}`); // LOG THIS
            res.status(403).render('error', {
                title: 'Access Denied',
                message: 'You do not have the necessary permissions to access this page.'
            });
        }
    };
};