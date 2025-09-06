import User from "../models/userModel.js";
import jwt from 'jsonwebtoken'
import Order from "../models/orderModel.js";
import bcrypt from 'bcryptjs';


  const registerUser = async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword, aadharNumber, panNumber, gstNumber, iecNumber } = req.body;

    if (!fullname || !email || !password || !confirmPassword || !aadharNumber || !panNumber || !gstNumber || !iecNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const user = new User({
      fullname,
      email,
      password: hashedPassword,
      confirmPassword,
      aadharNumber,
      panNumber,
      gstNumber,
      iecNumber,
      aadharProof: req.files?.aadharProof?.[0]?.filename || null,
      panProof: req.files?.panProof?.[0]?.filename || null,
      gstProof: req.files?.gstProof?.[0]?.filename || null,
      iecProof: req.files?.iecProof?.[0]?.filename || null,
    });

    await user.save();
    res.status(201).json({ message: "Registration successful. Pending admin approval." });

  } catch (err) {
    console.error("Error in registerUser:", err);
    res.status(500).json({ message: "Server error" });
  }
};




const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User not found. Please register.' });
        }

        const comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
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

// Controller function to fetch orders by userId
 const getOrdersByUserId = async (req, res) => {
    try {
      // Extract the userId from the request parameters
      const { user } = req.params;
  
      // Check if userId is provided
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
  
      // Fetch the orders by userId
      const orders = await Order.find({ user }).populate('user', 'firstName lastName email');  // Populate user details if needed
  
      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No orders found for this user'
        });
      }
  
      // Return the orders if found
      res.status(200).json({
        success: true,
        message: 'Orders fetched successfully',
        data: orders
      });
  
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong, please try again later.'
      });
    }
  };

  const   getUserDetails =async (req,res) =>{
    try{
        const {userId} = req.params;
        if(!userId){
          return res.status(400).json({message: "User ID is required"});
        }
        const user = await User.findById(userId).select("-password -confirmPassword");
        if(!user){
          return res.status(404).json({message: "User not found"});
        }
        res.status(200).json({message: "User details fetched successfully", user});

    }catch(error){
        console.error("Error fetching user details:", error);
        res.status(500).json({message: "Server error"});
    }
  }

  const updateUserDetails = async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password -confirmPassword");
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ message: "User details updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user details:", error);
      res.status(500).json({ message: "Server error" });
    } 
  };

const getPickupAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const user = await User.findById(userId).select("pickupAddresses");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Pickup address fetched successfully", pickupAddress: user.pickupAddresses });
  } catch (error) {
    console.error("Error fetching pickup address:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export {registerUser, loginUser, getOrdersByUserId, getUserDetails, updateUserDetails, getPickupAddress};