import User from "../models/userModel.js";
import jwt from 'jsonwebtoken'

const registerUser = async (req, res) => {
    const { fullname, email, password, confirmPassword } = req.body;

    console.log("Received data:", { fullname, email, password, confirmPassword });

    if (!fullname || !email || !password || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
    }

    // Log data before saving to ensure everything is correct
    console.log('About to save user with data:', { fullname, email, password });

    const user = new User({ fullname, email, password, confirmPassword }); // Include confirmPassword for logging purposes

    try {
        await user.save();
        return res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        console.error("Error during registration:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User not found. Please register.' });
        }

        const isValidPassword = await user.isPasswordValid(password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Invalid password.' });
        }

        // Generate JWT token with the secret from the environment variable
        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send token to frontend
        res.status(200).json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export {registerUser, loginUser};