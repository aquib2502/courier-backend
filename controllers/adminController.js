import Admin from "../models/adminModel.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Clubbing from "../models/clubbingModel.js";
import Manifest from "../models/manifestModel.js";
import Note from "../models/noteModel.js";
import { raiseDispute } from "./notificationController.js";
import Dispute from "../models/disputeModel.js";

dotenv.config();

const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Define roles and their credentials from env
    const roles = [
      {
        role: "SuperAdmin",
        username: process.env.SUPERADMIN_USERNAME,
        password: process.env.SUPERADMIN_PASSWORD,
      },
      {
        role: "Operator",
        username: process.env.OPERATOR_USERNAME,
        password: process.env.OPERATOR_PASSWORD,
      },
      {
        role: "PickUp",
        username: process.env.PICKUP_USERNAME,
        password: process.env.PICKUP_PASSWORD,
      },
      {
        role: "Finance",
        username: process.env.FINANCE_USERNAME,
        password: process.env.FINANCE_PASSWORD,
      },
    ];

    // Find matching role
    const matchedRole = roles.find(
      (r) => r.username === username && r.password === password
    );

    if (!matchedRole) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const admin = {
      username: matchedRole.username,
      role: matchedRole.role,
    };

    const token = jwt.sign(
      { username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ message: "Login successful", admin, token });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getUsersWithOrders = async (req, res) => {
  try {
    // Fetch all users without passwords
    const users = await User.find().select("-password");

    // Map users to include order count instead of full orders
    const usersWithOrderCount = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ user: user._id });
        return { ...user.toObject(), totalOrders: orderCount };
      })
    );

    res.status(200).json({
      message: "Users fetched successfully",
      users: usersWithOrderCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

const editUserKYCStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { kycStatus } = req.body;

    // Validate kycStatus
    if (!["pending", "approved", "rejected"].includes(kycStatus)) {
      return res.status(400).json({ message: "Invalid KYC status" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.kycStatus = kycStatus;
    await user.save();

    res.status(200).json({ message: "KYC status updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password -confirmPassword");
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res
      .status(200)
      .json({
        message: "User details updated successfully",
        user: updatedUser,
      });
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getClubbingDetails = async (req, res) => {
  try {
    const clubbingDetails = await Clubbing.find()
      .populate("userIds", "fullname email") // Populate user details
      .populate("clubbedOrders"); // Populate order details
    res.status(200).json({
      success: true,
      message: "Clubbing details fetched successfully",
      data: clubbingDetails,
    });
  } catch (error) {
    console.error("Error fetching clubbing details:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
};

const updateManifestStatus = async (req, res) => {
  try {
    const { manifestId } = req.params; // e.g., "MTTE000001"
    const { status } = req.body;

    const validStatuses = ["open", "pickup_requested", "closed", "picked_up"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // ✅ Find by manifestId, not by _id
    const updatedManifest = await Manifest.findOneAndUpdate(
      { manifestId }, // use manifestId as search field
      { status, pickupDate, pickupTime, updatedAt: new Date() },
      { new: true }
    ).populate("orders");

    if (!updatedManifest) {
      return res.status(404).json({
        success: false,
        message: "Manifest not found",
      });
    }

    // If status is "picked_up", update all linked orders
    if (status === "picked_up") {
      await Order.updateMany(
        { manifest: updatedManifest._id }, // still use real ObjectId for order linkage
        { manifestStatus: "dispatched", orderStatus: "Shipped" }
      );
    }

    res.status(200).json({
      success: true,
      message: "Manifest status updated successfully",
      data: updatedManifest,
    });
  } catch (error) {
    console.error("Error updating manifest status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update manifest status",
    });
  }
};

const addNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    const newNote = new Note({ title, content });
    await newNote.save();
    res.status(201).json({ message: "Note added successfully", note: newNote });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
    console.log(error);
  }
}

const getNote = async (req, res) => {
  try {
    // Fetch the most recent note
    const note = await Note.findOne().sort({ createdAt: -1 }); // descending order

    if (!note) {
      return res.status(404).json({ message: "No notes found" });
    }

    res.status(200).json({
      message: "Most recent note fetched successfully",
      note
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const adminRaiseDispute = async (req, res) => {
  try {
    const { orderIds, manifestId, type, description, clientId } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one orderId must be provided",
      });
    }

    // Raise notification (your existing logic)
    await raiseDispute({
      orderIds,
      manifestId,
      type,
      description,
      clientId,
    });

    // Create the dispute document
    const dispute = new Dispute({
      orderIds,      // array of orders
      manifestId,
      type,
      description,
      clientId,
      clientResponse: "pending", // default enum value
      status: "open",            // default enum value
    });

    await dispute.save();

    // Update all related orders to "disputed"
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { orderStatus: "disputed", manifestStatus: "disputed" } }
    );

    // Update the manifest if provided
    if (manifestId) {
      const manifest = await Manifest.findById(manifestId);
      if (manifest) {
        manifest.status = "disputed";
        await manifest.save();
      } else {
        console.log("Manifest not found!");
      }
    }

    res.status(201).json({
      success: true,
      message: "Dispute raised for all orders and client notified",
      dispute,
    });
  } catch (error) {
    console.error("Error in adminRaiseDispute:", error);
    res.status(500).json({
      success: false,
      message: "Failed to raise dispute",
      error: error.message,
    });
  }
};

const giveCredit = async (req, res) => {
  try {
    const { userId, creditLimit } = req.body;

    if (!userId || creditLimit === undefined) {
      return res.status(400).json({ success: false, message: 'User ID and credit limit are required' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Give credit
    user.hasCredit = true;
    user.creditLimit = creditLimit;
    user.usedCredit = 0; // Reset used credit
    user.creditResetDate = new Date(); // Start of the credit period

    await user.save();

    res.status(200).json({
      success: true,
      message: `Credit of ${creditLimit} given to user ${user.name}`,
      data: {
        userId: user._id,
        creditLimit: user.creditLimit,
        usedCredit: user.usedCredit
      }
    });

  } catch (error) {
    console.error('Error giving credit:', error);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};

const resetMonthlyCredit = async () => {
  try {
    const now = new Date();

    // Find users with credit
    const usersWithCredit = await User.find({ hasCredit: true });

    for (const user of usersWithCredit) {
      if (!user.creditResetDate) continue;

      // Calculate next reset date (1 month after last reset)
      const nextReset = new Date(user.creditResetDate);
      nextReset.setMonth(nextReset.getMonth() + 1);

      if (now >= nextReset) {
        user.usedCredit = 0;
        user.creditResetDate = now;
        await user.save();
        console.log(`Credit reset for user: ${user.fullname}`);
      }
    }
  } catch (error) {
    console.error('Error resetting monthly credit:', error);
  }
};



export {
  loginAdmin,
  getUsersWithOrders,
  editUserKYCStatus,
  updateUserDetails,
  getClubbingDetails,
  updateManifestStatus,
  addNote,
  getNote,
  giveCredit,
  resetMonthlyCredit
};
