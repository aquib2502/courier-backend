import Admin from '../models/adminModel.js'
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from '../models/userModel.js';
import Order from '../models/orderModel.js';


dotenv.config();

const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Define roles and their credentials from env
        const roles = [
            {
                role: "SuperAdmin",
                username: process.env.SUPERADMIN_USERNAME,
                password: process.env.SUPERADMIN_PASSWORD
            },
            {
                role: "Operator",
                username: process.env.OPERATOR_USERNAME,
                password: process.env.OPERATOR_PASSWORD
            },
            {
                role: "PickUp",
                username: process.env.PICKUP_USERNAME,
                password: process.env.PICKUP_PASSWORD
            }
        ];

        // Find matching role
        const matchedRole = roles.find(
            r => r.username === username && r.password === password
        );

        if (!matchedRole) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const admin = {
            username: matchedRole.username,
            role: matchedRole.role
        };

        const token = jwt.sign(
            { username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        )

        return res.status(200).json({ message: "Login successful", admin, token });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}



const getUsersWithOrders = async (req, res) => {
  try {
    // Fetch all users without passwords
    const users = await User.find().select('-password');

    // Map users to include order count instead of full orders
    const usersWithOrderCount = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ user: user._id });
        return { ...user.toObject(), totalOrders: orderCount };
      })
    );

    res.status(200).json({
      message: 'Users fetched successfully',
      users: usersWithOrderCount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

const editUserKYCStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { kycStatus } = req.body;

    // Validate kycStatus
    if (!['pending', 'approved', 'rejected'].includes(kycStatus)) {
      return res.status(400).json({ message: 'Invalid KYC status' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.kycStatus = kycStatus;
    await user.save();

    res.status(200).json({ message: 'KYC status updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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








export {loginAdmin,
    getUsersWithOrders,
    editUserKYCStatus,
    updateUserDetails
}