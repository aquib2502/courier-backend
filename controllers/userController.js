import User from "../models/userModel.js";
import jwt from 'jsonwebtoken'
import Order from "../models/orderModel.js";
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";
import Transaction from "../models/transactionModel.js";

const registerUser = async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword, aadharNumber, panNumber, gstNumber, iecNumber } = req.body;

    // 1. Basic validations
    if (!fullname || !email || !password || !confirmPassword || !aadharNumber || !panNumber || !gstNumber || !iecNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. File validation — ensure all proofs exist
    if (
      !req.files?.aadharProof?.[0] ||
      !req.files?.panProof?.[0] ||
      !req.files?.gstProof?.[0] ||
      !req.files?.iecProof?.[0]
    ) {
      return res.status(400).json({ message: "All document proofs must be uploaded" });
    }

    // 3. Validate file types and sizes (extra safe)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    const proofs = [req.files.aadharProof[0], req.files.panProof[0], req.files.gstProof[0], req.files.iecProof[0]];
    for (const proof of proofs) {
      if (!allowedTypes.includes(proof.mimetype)) {
        return res.status(400).json({ message: "Please upload only JPG, PNG, or PDF files" });
      }
      if (proof.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "Each file must be under 5MB" });
      }
    }

    // 4. Prevent duplicate users
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // 5. Hash and save
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullname,
      email,
      password: hashedPassword,
      aadharNumber,
      panNumber,
      gstNumber,
      iecNumber,
      aadharProof: req.files.aadharProof[0].filename,
      panProof: req.files.panProof[0].filename,
      gstProof: req.files.gstProof[0].filename,
      iecProof: req.files.iecProof[0].filename,
    });

    await user.save();
    return res.status(201).json({ message: "Registration successful. Pending admin approval." });

  } catch (err) {
    console.error("Error in registerUser:", err);
    return res.status(500).json({ message: "Server error" });
  }
};




const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User not found. Please register.' });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate access token (JWT)
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Generate refresh token (JWT)
        const refreshToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.REFRESH_SECRET,
            { expiresIn: '7d' }
        );

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,           // must be HTTPS
  sameSite: 'None',       // required for cross-domain
  domain: '.thetraceexpress.com', // note the leading dot
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

        // Send access token to frontend
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
      const orders = await Order.find({ user }).populate('user', 'fullname email');  // Populate user details if needed
  
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

const getOrderCountForUser = async (req, res) => {
  try {
    // Get user ID from req.user (populated by authMiddleware)
    const userId = req.user._id || req.user.userId;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // Aggregate orders to count by status
    const orderCounts = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // All possible statuses
    const statuses = [
      'Drafts',
      'Ready',
      'Packed',
      'Manifested',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Refunded',
      'disputed'
    ];

    // Build response with 0 for missing statuses
    const formattedCounts = {};
    statuses.forEach(status => {
      const found = orderCounts.find(item => item._id === status);
      formattedCounts[status] = found ? found.count : 0;
    });

    return res.status(200).json({
      success: true,
      message: "Order counts fetched successfully",
      data: formattedCounts
    });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

  const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId).select("-password -confirmPassword");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Map -> plain object conversion
    const plainUser = user.toObject();
    if (plainUser.packageDiscounts instanceof Map) {
      plainUser.packageDiscounts = Object.fromEntries(plainUser.packageDiscounts);
    } else if (
      typeof plainUser.packageDiscounts !== "object" ||
      Array.isArray(plainUser.packageDiscounts)
    ) {
      plainUser.packageDiscounts = {};
    }

    res.status(200).json({
      message: "User details fetched successfully",
      user: plainUser,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
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

const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken; // Read HTTP-only cookie
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    // Verify token signature and expiration only
    const payload = jwt.verify(token, process.env.REFRESH_SECRET);

    // Generate a new access token
    const newAccessToken = jwt.sign(
      { userId: payload.userId, email: payload.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

const fetchUserTransaction = async (req, res) => {
  try {
    // req.user comes from authMiddleware
    const userId = req.user._id || req.user.userId;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // Fetch transaction(s) for the user
    const transactions = await Transaction.find({ user: userId });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ success: false, message: "No transactions found for this user" });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction(s) fetched successfully",
      data: transactions
    });

  } catch (error) {
    console.error('Error fetching transaction', error);
    return res.status(500).json({ success: false, message: 'Error fetching transaction' });
  }
};


export {registerUser, loginUser, getOrdersByUserId, getUserDetails, updateUserDetails, getPickupAddress, getOrderCountForUser, refreshToken, fetchUserTransaction};