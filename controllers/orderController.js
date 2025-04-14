import Order from '../models/orderModel.js'; // Import the Order model

// Controller function to handle order creation
export const createOrder = async (req, res) => {
  try {
    const {
      firstName, lastName, mobile, pickupAddress, address1, pincode, city, country, state,
      shipmentType, shipmentDetails, invoiceNo, invoiceCurrency, orderDate, etnNumber, items
    } = req.body;

    const newOrder = new Order({
      firstName,
      lastName,
      mobile,
      pickupAddress,
      address1,
      pincode,
      city,
      country,
      state,
      shipmentType,
      shipmentDetails,
      invoiceNo,
      invoiceCurrency,
      orderDate,
      etnNumber,
      items
    });

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
