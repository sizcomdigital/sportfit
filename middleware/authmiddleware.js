const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/admin/login');
    }
    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;  // Attach the decoded token to the request object
        next();               // Continue to the next middleware
    } catch (err) {
        return res.status(403).send({ message: "Invalid token" });
    }
};

module.exports = verifyToken;