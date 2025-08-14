const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        let token = authHeader && authHeader.split(' ')[1]; // Extract token from header

        console.log(token, "Extracted Token from Header");

        // Fallback to token in HTTP-only cookies
        if (!token && req.cookies) {
            token = req.cookies.authToken; 
            console.log(token, "Token from Cookies");
        }

        // If no token, clear session and redirect immediately
        if (!token) {
            if (req.session) {
                req.session.destroy(() => {
                    return res.redirect('/register'); // Redirect if session is cleared
                });
            } else {
                return res.redirect('/register');
            }
        }

        // Verify JWT token
        jwt.verify(token, process.env.JWT_ACCESS_KEY, (err, decodedUser) => {
            if (err) {
                console.error("Token Verification Error:", err.message);
                return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
            }
            
            req.user = decodedUser; // Attach user info to request
            
            // Store user info in session for persistence
            if (req.session) {
                req.session.user = decodedUser;
            }

            next(); // Proceed to next middleware
        });

    } catch (error) {
        console.error("Authentication Error:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = authenticateToken; 