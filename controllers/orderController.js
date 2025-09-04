import Order from '../models/orderModel.js'; // Import the Order model
import User from '../models/userModel.js';

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
    const orders = await Order.find().populate('user', 'firstname lastname email mobile'); // Populate user details
    res.status(200).json({
      success: true,
      data: orders
    });

  } catch (error) {
     res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    }, error);
    console.error('Error retrieving orders:', error);

  }
};


export { createOrder, updateOrderStatus, getTotalOrderCount, getAllOrders };