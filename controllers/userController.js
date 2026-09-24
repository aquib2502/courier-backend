import User from "../models/userModel.js";
import jwt from 'jsonwebtoken'
import Order from "../models/orderModel.js";
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";
import Transaction from "../models/transactionModel.js";
import PDFDocument from "pdfkit";
import moment from "moment";
import Invoice from "../models/invoiceModel.js";
import Partner from "../modules/domestic/models/partnerModel.js";


const registerUser = async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword, aadharNumber, panNumber, gstNumber, iecNumber } = req.body;

    // 1. Basic validations
    if (!fullname || !email || !password || !confirmPassword || !aadharNumber || !panNumber) {
      return res.status(400).json({ message: "Fullname, email, password, aadhar and PAN are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Aadhar & PAN proofs mandatory
    if (!req.files?.aadharProof?.[0] || !req.files?.panProof?.[0]) {
      return res.status(400).json({ message: "Aadhar and PAN proofs are required" });
    }

    // 3. File type & size validation — only validate if file exists
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "application/pdf"];
    const allProofs = [
      req.files.aadharProof?.[0],
      req.files.panProof?.[0],
      req.files.gstProof?.[0],
      req.files.iecProof?.[0]
    ].filter(Boolean); // removes null values

    for (const proof of allProofs) {
      if (!allowedTypes.includes(proof.mimetype)) {
        return res.status(400).json({ message: "Please upload only JPG, PNG, WEBP, GIF, or PDF files" });
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

    // 5. Hash & save user
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
      gstProof: req.files.gstProof?.[0]?.filename || null,
      iecProof: req.files.iecProof?.[0]?.filename || null,
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
        let user = await User.findOne({ email });
        let isPartner = false;

        if (!user) {
            // Check if partner exists
            user = await Partner.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'User or Partner not found. Please register.' });
            }
            isPartner = true;
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate access token (JWT)
        const tokenPayload = { userId: user._id, email: user.email };
        if (isPartner) {
            tokenPayload.role = 'partner';
        }

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Generate refresh token (JWT)
        const refreshToken = jwt.sign(
            tokenPayload,
            process.env.REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        const host = req.get('host') || '';
        const cookieOptions = {
          httpOnly: true,
          secure: true,           // must be HTTPS
          sameSite: 'None',       // required for cross-domain
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000
        };

        if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
          cookieOptions.domain = '.thetraceexpress.com';
        }

        res.cookie('refreshToken', refreshToken, cookieOptions);

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

    let user = await User.findById(userId).select("-password -confirmPassword");
    if (!user) {
      // Check if it's a partner
      const partner = await Partner.findById(userId).select("-password");
      if (partner) {
        const partnerUser = {
          _id: partner._id,
          fullname: partner.name,
          email: partner.email || "",
          walletBalance: partner.walletBalance || 0,
          role: "partner",
          packageDiscounts: {}
        };
        return res.status(200).json({
          message: "Partner details fetched successfully",
          user: partnerUser,
        });
      }
      return res.status(404).json({ message: "User or Partner not found" });
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

    const tokenPayload = { userId: payload.userId, email: payload.email };
    if (payload.role) {
      tokenPayload.role = payload.role;
    }

    // Generate a new access token
    const newAccessToken = jwt.sign(
      tokenPayload,
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

  const colWidths = [40, 80, 100, 120, 50, 70, 90];

  const printTableHeader = (topY) => {
    const headers = ["S.No", "Date", "InvNo", "Customer", "Dest.", "Weight(kg)", "Amount (INR)"];
    let x = 40;

    headers.forEach((header, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(header, x, topY, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });

    doc.moveTo(40, topY + 15).lineTo(550, topY + 15).stroke();
  };

  // 🔰 Emerald theme branding header
  doc.rect(0, 0, doc.page.width, 60).fill("#059669");

  // ✅ Company Name inside green bar (left)
  doc
    .fillColor("white")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("The Trace Express", 40, 20);

  // ✅ Subtitle (right aligned) inside the green bar
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

  // Table headers on page 1
  const tableTop = 150;
  printTableHeader(tableTop);

  // Table rows
  let y = tableTop + 25;
  orders.forEach((order, i) => {
    if (y > 720) {
      doc.addPage();
      printTableHeader(40);
      y = 65;
    }

    const rawDate = order.invoiceDate || order.createdAt;
    const dateStr = rawDate ? moment(rawDate).format("YYYY-MM-DD") : "N/A";
    const firstName = order.firstName || "";
    const lastName = order.lastName || "";
    const customer = `${firstName.trim()} ${lastName.trim()}`.trim() || "N/A";
    const countryStr = order.country || "";
    const dest =
      countryStr === "United States"
        ? "US"
        : countryStr ? countryStr.slice(0, 2).toUpperCase() : "N/A";

    const invoiceNo = order.invoiceNo || order.lastMileAWB || "N/A";
    const weight = order.weight != null ? parseFloat(order.weight).toFixed(2) : "0.00";
    const rawTotal = order.totalAmount != null ? Number(order.totalAmount) : 0;
    // Remove 18% GST from totalAmount (base amount = totalAmount / 1.18)
    const amountWithoutGST = (rawTotal / 1.18).toFixed(2);

    const row = [
      i + 1,
      dateStr,
      invoiceNo,
      customer,
      dest,
      weight,
      amountWithoutGST,
    ];

    let x = 40;
    row.forEach((cell, j) => {
      doc.font("Helvetica").fontSize(9).fillColor("black").text((cell ?? "").toString(), x, y, { width: colWidths[j] - 5, lineBreak: false });
      x += colWidths[j];
    });

    y += 18;
  });

  // Check space for calculation summary
  if (y + 120 > 750) {
    doc.addPage();
    y = 40;
  }

  // ✅ Calculation Summary Section
  y += 15;
  doc.moveTo(40, y).lineTo(550, y).stroke();

  y += 10;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("black").text("Sub-Total:", 400, y);
  doc.font("Helvetica").text((subTotal || 0).toFixed(2), 480, y, {
    width: 80,
    align: "right",
  });

  y += 20;
  doc.font("Helvetica-Bold").text("GST (18%):", 400, y);
  doc.font("Helvetica").text((gst || 0).toFixed(2), 480, y, {
    width: 80,
    align: "right",
  });

  y += 20;
  doc.font("Helvetica-Bold").text("Bill Amount:", 400, y);
  doc.font("Helvetica").text((totalWithGST || 0).toFixed(2), 480, y, {
    width: 80,
    align: "right",
  });

  y += 40;
  doc.font("Helvetica-Bold").text("Amount in Words:", 40, y);
  doc
    .font("Helvetica")
    .text(numberToWords(Math.round(totalWithGST || 0)), 180, y, { width: 350 });

  // ✅ Footer
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

    // ✅ Fetch ALL orders placed/dated in this month (sorted ascending so latest comes at the end of the PDF)
    const orders = await Order.find({
      user: userId,
      $or: [
        { invoiceDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    })
      .sort({ createdAt: 1 })
      .select(
        "firstName lastName invoiceNo lastMileAWB country weight totalAmount invoiceDate createdAt"
      );

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found for this month" });
    }

    // ✅ Calculate financials for all matching orders
    const totalWithGST = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const subTotal = totalWithGST / 1.18;
    const gst = totalWithGST - subTotal;

    // ✅ Check if invoice record already exists for this user and billing period
    let invoiceRecord = await Invoice.findOne({
      user: userId,
      "billingPeriod.start": startOfMonth,
      "billingPeriod.end": endOfMonth,
    });

    if (invoiceRecord) {
      // Sync existing invoice with complete order set and updated totals
      invoiceRecord.orders = orders.map((o) => o._id);
      invoiceRecord.subTotal = subTotal;
      invoiceRecord.gst = gst;
      invoiceRecord.totalAmount = totalWithGST;
      await invoiceRecord.save();
    } else {
      // Create new invoice record
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const datePart = moment().format("MMDD");
      const timePart = moment().format("HHmmss");
      const invoiceNumber = `INVTTE${randomPart}${datePart}${timePart}`;

      invoiceRecord = await Invoice.create({
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
    }

    // ✅ Generate PDF with updated complete list of orders
    return generateInvoicePDF(res, orders, invoiceRecord, targetDate);

  } catch (error) {
    console.error("Error generating PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error while generating PDF",
        error: error.message,
      });
    }
  }
};




export {registerUser, loginUser, getOrdersByUserId, getUserDetails, updateUserDetails, getPickupAddress, getOrderCountForUser, refreshToken, fetchUserTransaction, getFinalBillPDF};