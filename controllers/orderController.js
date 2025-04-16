import Order from '../models/orderModel.js'; // Import the Order model

// Controller function to handle order creation
export const createOrder = async (req, res) => {
  try {
    const newOrder = new Order(req.body);

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      data: newOrder
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong, please try again later.'
    });
  }
};
