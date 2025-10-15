import axios from "axios";
import Order from "../models/orderModel.js";

const getTracking = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    // Find order by invoiceNo and populate user if needed
    const order = await Order.findOne({ invoiceNo: orderId }).populate('user');
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const partnerName = order.shippingPartner?.name?.toLowerCase() || '';

    // Check if shipping partner includes 'self'
    if (partnerName.includes('self')) {
      const apiUrl = "http://198.38.81.111:9002/api/Track/GetTrackings";

      // Credentials for the tracking API
     // Build payload exactly as required
      const payload = {
        ValidateAccount: [
          {
            AccountCode: "ASE09",
            Username: "ASE09",
            Password: "123" ,// replace with actual password
            AccessKey: "F0EB1A9F"
          }
        ],
        Awbno: order.lastMileAWB
      };

      const headers = {
        Authorization: 'F0EB1A9F',
        'Content-Type': 'application/json'
      };

      try {
        const response = await axios.post(apiUrl, payload, { headers });
        return res.status(200).json({
          success: true,
          message: "Tracking data fetched successfully",
          tracking: response.data
        });
      } catch (apiError) {
        console.error("Tracking API error:", apiError.message);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch tracking details",
          error: apiError.response?.data || apiError.message
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "This order's shipping partner is not a self-service partner"
      });
    }

  } catch (err) {
    console.error("Error in getTracking:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};

export { getTracking };