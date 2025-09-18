import Order from '../models/orderModel.js'; // Import the Order model
import User from '../models/userModel.js';
import Clubbing from '../models/clubbingModel.js';

// Controller function to handle order creation
 const createOrder = async (req, res) => {
  try {
    console.log('Request Body:', req.body);  // Log the request body to verify if userId is there

    const { user, ...orderData } = req.body;  // Destructure userId from the body

    // Ensure userId is being passed
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to create an order'
      });
    }

    // Log the userId for debugging
    console.log('Received userId:', user);

    const userKyc = await User.findById(user);
    
    if(userKyc.kycStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'User KYC is not approved. Cannot create order.'
      });
    }

    const serialNumber = await  generateSerialNumber();
    // Create a new order instance, ensuring userId is included
    const newOrder = new Order({
      ...orderData,
      user: user,
      invoiceNo: serialNumber // Save the userId in the order
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      data: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);  // Log the error for debugging
    res.status(500).json({
      success: false,
      message: 'Something went wrong, please try again later.'
    });
  }
};


const updateOrderStatus = async (req, res) => {
try {
  const { orderId } = req.params;
  const { orderStatus, manifestStatus, receivedAt } = req.body;

  const updatedOrder = await Order.findByIdAndUpdate(
    orderId, 
    { orderStatus, manifestStatus, receivedAt }, 
    { new: true }
  );

  if (!updatedOrder) {
    return res.status(404).json({ 
      success: false, 
      message: 'Order not found' 
    });
  }

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: updatedOrder
  });
} catch (error) {
  console.error('Error updating order status:', error);
  res.status(500).json({
    success: false,
    message: 'Something went wrong, please try again later.'
  });

}
}


const getTotalOrderCount = async (req, res) => {
  try {
    // Count all orders in the database (not user-specific)
    const totalCount = await Order.countDocuments({});
    
    res.status(200).json({
      success: true,
      data: {
        totalCount: totalCount
      }
    });
  } catch (error) {
    console.error('Error getting total order count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order count'
    });
  }
};

// Generate serial number automatically
const generateSerialNumber = async () => {
  // Count existing orders
  const totalCount = await Order.countDocuments({});

  // Format the new serial number
  const paddedCount = String(totalCount + 1).padStart(6, '0');
  return `TTE${paddedCount}`;
};


const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'fullname mobile')          // Populate user details
      .populate('manifest', 'manifestId status');   // Populate manifest details

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
};


const clubOrders = async (req, res) => {
  try {
    const { userIds, orderIds, clubName } = req.body;

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    }
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds must be a non-empty array' });
    }

    // Fetch users with fullname and email
    const users = await User.find({ _id: { $in: userIds } }, 'fullname email');
    if (users.length !== userIds.length) {
      return res.status(404).json({ success: false, message: 'One or more users not found' });
    }

    // Verify orders exist
    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length !== orderIds.length) {
      return res.status(404).json({ success: false, message: 'One or more orders not found' });
    }

    // Create clubbing entry
    const clubbing = new Clubbing({
      clubName,
      userIds, // keep IDs for reference
      usernames: users.map(u => u.fullname).join(', '), // Concatenate names
      useremails: users.map(u => u.email).join(', '), // Concatenate emails
      clubbedOrders: orderIds,
    });

    await clubbing.save();

    res.status(201).json({
      success: true,
      message: 'Orders clubbed successfully',
      data: {
        id: clubbing._id,
        users, // Array of user objects with fullname and email
        clubbedOrders: clubbing.clubbedOrders,
        clubbedAt: clubbing.clubbedAt
      }
    });
  } catch (error) {
    console.error('Error clubbing orders:', error.message);
    res.status(500).json({ success: false, message: 'Failed to club orders' });
  }
};


export { createOrder, updateOrderStatus, getTotalOrderCount, getAllOrders, clubOrders };