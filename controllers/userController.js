import User from "../models/userModel.js";

const registerUser = async (req, res) => {
    const{fullname, email, password, confirmPassword} = req.body;
    try{
        const existingUser =await User.findOne({email});
        if (existingUser){
            return res.status(400).json({message: "User already exists"});
        }

        const user = new User({
            fullname,
            email,
            password,
            confirmPassword
        });

        await user.save();
        res.status(201).json({message: "User registered successfully", user});
    }catch(error){
        res.status(500).json({message: "Server error", error});
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