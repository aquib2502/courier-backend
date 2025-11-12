import User from "../models/userModel.js";
import jwt from 'jsonwebtoken'
import Order from "../models/orderModel.js";
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";
import Transaction from "../models/transactionModel.js";
import PDFDocument from "pdfkit";
import moment from "moment";
import Invoice from "../models/invoiceModel.js";


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
  
     // Fetch and sort orders by newest first
    const orders = await Order.find({ user })
      .populate('user', 'fullname email')
      .sort({ createdAt: -1 }); // latest first

      
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


// ✅ Convert number to words
function numberToWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  if ((num = num.toString()).length > 9) return "Overflow";
  let n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore " : "";
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh " : "";
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand " : "";
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " Hundred " : "";
  str += (n[5] != 0)
    ? ((str != "") ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) + " "
    : "";
  return str + "Only";
}

const generateInvoicePDF = (res, orders, invoiceData, targetDate) => {
  

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=final_bill.pdf");
  doc.pipe(res);

  const { invoiceNumber, subTotal, gst, totalAmount: totalWithGST } = invoiceData;

  // 🔰 Emerald theme branding header
  doc.rect(0, 0, doc.page.width, 60).fill("#059669");

  // ✅ Company Name inside green bar (left)
  doc
    .fillColor("white")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("The Trace Express", 40, 20);

  // ✅ Subtitle (centered) inside the green bar
  doc.fontSize(11).text("Monthly Billing Report", 0, 25, { align: "right" });

  // ✅ Invoice number just below green bar
  doc
    .fillColor("black")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(`Invoice No: ${invoiceNumber}`, 40, 75);

  doc.moveDown(0.8);

  // ✅ Date range info below invoice number
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(
      `Billing Period: ${targetDate
        .clone()
        .startOf("month")
        .format("MMM DD, YYYY")} - ${targetDate
        .clone()
        .endOf("month")
        .format("MMM DD, YYYY")}`,
      40,
      doc.y
    );

  doc.moveDown(0.3);

  doc.text(`Generated on: ${moment().format("MMM DD, YYYY")}`, 40, doc.y);

  doc.moveDown(1.2);
  doc.moveDown(2);
  doc.fillColor("black");

  // Table headers
  const tableTop = 150;
  const headers = ["S.No", "Date", "InvNo", "Customer", "Dest.", "Weight(kg)", "Amount (INR)"];
  const colWidths = [40, 80, 100, 120, 50, 70, 90];
  let x = 40;

  headers.forEach((header, i) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(header, x, tableTop, { width: colWidths[i], align: "left" });
    x += colWidths[i];
  });

  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Table rows
  let y = tableTop + 25;
  orders.forEach((order, i) => {
    const date = moment(order.invoiceDate).format("YYYY-MM-DD");
    const customer = `${order.firstName.trim()} ${order.lastName.trim()}`;
    const dest =
      order.country === "United States"
        ? "US"
        : order.country.slice(0, 2).toUpperCase();

    const row = [
      i + 1,
      date,
      order.invoiceNo,
      customer,
      dest,
      parseFloat(order.weight).toFixed(2),
      order.totalAmount.toFixed(2),
    ];

    x = 40;
    row.forEach((cell, j) => {
      doc.font("Helvetica").fontSize(9).text(cell.toString(), x, y);
      x += colWidths[j];
    });

    y += 20;
    if (y > 720) {
      doc.addPage();
      y = 100;
    }
  });

  // ✅ Calculation Summary Section
  doc.moveDown(2);
  y += 30;
  doc.moveTo(40, y).lineTo(550, y).stroke();

  y += 10;
  doc.font("Helvetica-Bold").fontSize(10).text("Sub-Total:", 400, y);
  doc.font("Helvetica").text(subTotal.toFixed(2), 480, y, {
    width: 80,
    align: "right",
  });

  y += 20;
  doc.font("Helvetica-Bold").text("GST (18%):", 400, y);
  doc.font("Helvetica").text(gst.toFixed(2), 480, y, {
    width: 80,
    align: "right",
  });

  y += 20;
  doc.font("Helvetica-Bold").text("Bill Amount:", 400, y);
  doc.font("Helvetica").text(totalWithGST.toFixed(2), 480, y, {
    width: 80,
    align: "right",
  });

  y += 40;
  doc.font("Helvetica-Bold").text("Amount in Words:", 40, y);
  doc
    .font("Helvetica")
    .text(numberToWords(Math.round(totalWithGST)), 180, y, { width: 350 });

  // ✅ Footer
  doc.moveDown(3);
  doc
    .fontSize(9)
    .fillColor("gray")
    .text(
      "This is a computer generated report, you can download your tax invoice from the panel.",
      40,
      760,
      { align: "center", width: 500 }
    );

  doc.end();
};


const getFinalBillPDF = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { year, month } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    // ✅ Determine billing month
    let targetDate;
    if (year && month) {
      targetDate = moment(`${year}-${month}`, "YYYY-MM");
    } else {
      targetDate = moment();
    }

    const startOfMonth = targetDate.clone().startOf("month").toDate();
    const endOfMonth = targetDate.clone().endOf("month").toDate();

    // ✅ Check if invoice already exists for this user and billing period
    const existingInvoice = await Invoice.findOne({
      user: userId,
      "billingPeriod.start": startOfMonth,
      "billingPeriod.end": endOfMonth,
    }).populate("orders");

    if (existingInvoice) {
      console.log("✅ Existing invoice found:", existingInvoice.invoiceNumber);
      return generateInvoicePDF(res, existingInvoice.orders, existingInvoice, targetDate);
    }

    // ✅ If no invoice exists, fetch orders
    const orders = await Order.find({
      user: userId,
      invoiceDate: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .sort({ createdAt: -1 })
      .select(
        "firstName lastName lastMileAWB country weight totalAmount invoiceDate"
      );

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found for this month" });
    }

    // ✅ Financials
    const totalWithGST = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const subTotal = totalWithGST / 1.18;
    const gst = totalWithGST - subTotal;

    // ✅ Generate unique invoice number
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const datePart = moment().format("MMDD");
    const timePart = moment().format("HHmmss");
    const invoiceNumber = `INVTTE${randomPart}${datePart}${timePart}`;

    // ✅ Create new invoice record
    const newInvoice = await Invoice.create({
      invoiceNumber,
      user: userId,
      orders: orders.map((o) => o._id),
      subTotal,
      gst,
      totalAmount: totalWithGST,
      billingPeriod: {
        start: startOfMonth,
        end: endOfMonth,
      },
    });

    // ✅ Generate PDF
    return generateInvoicePDF(res, orders, newInvoice, targetDate);

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Server error while generating PDF",
      error: error.message,
    });
  }
};




export {registerUser, loginUser, getOrdersByUserId, getUserDetails, updateUserDetails, getPickupAddress, getOrderCountForUser, refreshToken, fetchUserTransaction, getFinalBillPDF};