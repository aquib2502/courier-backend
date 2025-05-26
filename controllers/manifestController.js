// controllers/manifestController.js
import Manifest from '../models/manifestModel.js';
import Order from '../models/orderModel.js';

// Generate unique manifest ID
const generateManifestId = () => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `MSG${timestamp}${random}`;
};

// Generate pickup AWB
const generatePickupAWB = () => {
  return "AWB" + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Create new manifest
export const createManifest = async (req, res) => {
  try {
    const { 
      orderIds, 
      pickupAddress, 
      userId,
      courierPartner = 'The Trace Express'
    } = req.body;

    // Validate required fields
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one order must be selected'
      });
    }

    if (!pickupAddress || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Pickup address and user ID are required'
      });
    }

    // Verify orders exist and are in 'Packed' status
    const orders = await Order.find({
      _id: { $in: orderIds },
      user: userId,
      orderStatus: 'Packed',
      manifestStatus: 'open'
    });

    if (orders.length !== orderIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some orders are not available for manifesting'
      });
    }

    // Calculate totals
    const totalWeight = orders.reduce((sum, order) => sum + Number(order.weight || 0), 0);
    const totalValue = orders.reduce((sum, order) => {
      const orderValue = order.productItems?.reduce(
        (orderSum, item) => orderSum + (Number(item.productQuantity || 0) * Number(item.productPrice || 0)),
        0
      ) || 0;
      return sum + orderValue;
    }, 0);

    // Generate manifest ID and AWB
    const manifestId = generateManifestId();
    const pickupAWB = generatePickupAWB();

    // Create new manifest
    const newManifest = new Manifest({
      manifestId,
      user: userId,
      pickupAddress,
      orders: orderIds,
      courierPartner,
      totalOrders: orders.length,
      totalWeight,
      totalValue,
      pickupAWB,
      estimatedPickup: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    });

    await newManifest.save();

    // Update orders status
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        manifest: newManifest._id,
        manifestStatus: 'manifested',
        orderStatus: 'Manifested'
      }
    );

    // Populate the manifest with order details
    const populatedManifest = await Manifest.findById(newManifest._id)
      .populate('orders')
      .populate('user', 'fullname email');

    res.status(201).json({
      success: true,
      message: 'Manifest created successfully',
      data: populatedManifest
    });

  } catch (error) {
    console.error('Error creating manifest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create manifest'
    });
  }
};

// Get all manifests for a user
export const getManifestsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const manifests = await Manifest.find({ user: userId })
      .populate('orders', 'invoiceNo firstName lastName weight')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: manifests
    });

  } catch (error) {
    console.error('Error fetching manifests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manifests'
    });
  }
};

// Get manifest by ID with full order details
export const getManifestById = async (req, res) => {
  try {
    const { manifestId } = req.params;

    const manifest = await Manifest.findById(manifestId)
      .populate('orders')
      .populate('user', 'fullname email');

    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }

    res.status(200).json({
      success: true,
      data: manifest
    });

  } catch (error) {
    console.error('Error fetching manifest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manifest'
    });
  }
};

// Update manifest status
export const updateManifestStatus = async (req, res) => {
  try {
    const { manifestId } = req.params;
    const { status, pickupDate, pickupTime } = req.body;

    const validStatuses = ['open', 'pickup_requested', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updatedManifest = await Manifest.findByIdAndUpdate(
      manifestId,
      { status, pickupDate, pickupTime, updatedAt: new Date() },
      { new: true }
    ).populate('orders');

    if (!updatedManifest) {
      return res.status(404).json({
        success: false,
        message: 'Manifest not found'
      });
    }

    // If status is closed, update all linked orders to dispatched
    if (status === 'closed') {
      await Order.updateMany(
        { manifest: manifestId },
        { manifestStatus: 'dispatched', orderStatus: 'Shipped' }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Manifest status updated successfully',
      data: updatedManifest
    });

  } catch (error) {
    console.error('Error updating manifest status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update manifest status'
    });
  }
};

// Get packed orders available for manifesting
export const getPackedOrdersForManifest = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({
      user: userId,
      orderStatus: 'Packed',
      manifestStatus: 'open'
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Error fetching packed orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packed orders'
    });
  }
};