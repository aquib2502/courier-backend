import User from "../models/userModel.js";

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
            return res.status(400).json({ message: "User not found. Please register" });
        }

        // Check if password is valid by calling on the user instance
        const isValidPassword = await user.isPasswordValid(password); // Fix: Call on the instance of user
        if (!isValidPassword) {
            return res.status(400).json({ message: "Invalid password" });
        }
        
        // Successful login
        res.status(200).json({ message: "Login successful" });
    } catch (error) {
        console.error("Login error:", error); // Log detailed error
        res.status(500).json({ message: "Server error", error: error.message }); // Send detailed error message
    }
};

export {registerUser, loginUser};