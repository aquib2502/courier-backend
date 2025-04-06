import jwt from 'jsonwebtoken';

// Middleware to check if the user is authenticated
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized. Please log in first.' });
    }

    try {
        // Verify the token using the JWT_SECRET from the .env file
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use process.env.JWT_SECRET
        req.user = decoded; // Store the decoded token payload (e.g., user data)
        next(); // Allow the request to proceed
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }
};

export default authMiddleware;
