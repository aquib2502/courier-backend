import mongoose from 'mongoose';
const { Schema } = mongoose;

// Vendor Order Items Sub-schema for ShipGlobal (second JSON)
const shipGlobalVendorOrderItemSchema = new Schema({
  vendor_order_item_name: { type: String, required: true },
  vendor_order_item_sku: { type: String, default: '' },
  vendor_order_item_quantity: { type: Number, required: true },
  vendor_order_item_unit_price: { type: Number, required: true },
  vendor_order_item_hsn: { type: String, required: true },
  vendor_order_item_tax_rate: { type: Number, required: true },
});

// Order Schema for ShipGlobal (second JSON)
const shipGlobalOrderSchema = new Schema({
  invoice_no: { type: String, required: true },
  invoice_date: { type: String, required: true },
  order_reference: { type: String, required: true },
  service: { type: String, required: true },
  package_weight: { type: Number, required: true },
  package_length: { type: Number, required: true },
  package_breadth: { type: Number, required: true },
  package_height: { type: Number, required: true },
  currency_code: { type: String, required: true },
  csb5_status: { type: Number, required: true },
  customer_shipping_firstname: { type: String, required: true },
  customer_shipping_lastname: { type: String, required: true },
  customer_shipping_mobile: { type: String, required: true },
  customer_shipping_email: { type: String, required: true },
  customer_shipping_company: { type: String, default: '' },
  customer_shipping_address: { type: String, required: true },
  customer_shipping_address_2: { type: String, required: true },
  customer_shipping_address_3: { type: String, default: '' },
  customer_shipping_city: { type: String, required: true },
  customer_shipping_postcode: { type: String, required: true },
  customer_shipping_country_code: { type: String, required: true },
  customer_shipping_state: { type: String, required: true },
  ioss_number: { type: String, default: '' },
  customer_nickname: { type: String, required: true },
  vendor_order_items: [shipGlobalVendorOrderItemSchema],
});

// Export ShipGlobal Order Schema as ShipGlobalSchema
const ShipGlobalSchema = mongoose.model('ShipGlobalOrder', shipGlobalOrderSchema);
export { ShipGlobalSchema };
