const User = require("../models/user");

/**
 * Middleware to check if user has firstLogin set to true.
 * If firstLogin is true, redirects or instructs the client to redirect to '/forget-password'.
 * If false, allows the request to continue.
 */
const checkFirstLogin = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.currentUser?.id || req.params?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please provide a valid token."
            });
        }

        // Fetch fresh user record from database
        const user = req.currentUser || await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        req.currentUser = user;

        // If firstLogin is true, enforce redirect to the changePassword URL
        if (user.firstLogin === true) {
            // For standard browser navigation requests
            if (req.accepts("html") && !req.accepts("json") && !req.xhr) {
                return res.redirect("/changePassword");
            }

            // For REST API / AJAX / Fetch requests
            return res.status(403).json({
                success: false,
                code: "FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED",
                firstLogin: true,
                redirectTo: "/changePassword",
                message: "First login detected. Please set your password or skip at /changePassword."
            });
        }

        // If firstLogin is false, proceed normally
        next();
    } catch (error) {
        console.error("First login check middleware error:", error);
        next(error);
    }
};

module.exports = {
    checkFirstLogin,
    requirePasswordChangeIfFirstLogin: checkFirstLogin // Alias for backwards compatibility
};
