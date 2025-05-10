import Order from '../models/orderModel.js'; // Import the Order model

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

    // Create a new order instance, ensuring userId is included
    const newOrder = new Order({
      ...orderData,
      user: user  // Save the userId in the order
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
  const { orderStatus } = req.body;

  const updatedOrder = await Order.findByIdAndUpdate(
    orderId, 
    { orderStatus }, 
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

export { createOrder, updateOrderStatus };