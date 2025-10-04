import axios from 'axios';
import iso3166 from 'iso-3166-1'

export const ShipGlobalShipmentCallApi = async (orderData) => {
  // Get the ISO-2 country code based on the country name
  const countryCode = iso3166.whereCountry(orderData.country); // Pass country name to get ISO-2 code

  if (!countryCode) {
    throw new Error(`Country code for ${orderData.country} not found`);
  }

  // Map your orderData to shipment payload for ShipGlobal API
  const shipmentPayload = {
    invoice_no: orderData.invoiceNo,  // Unique invoice number (order_id)
    invoice_date: new Date(orderData.invoiceDate).toLocaleDateString('en-GB'),  // Format: YYYY-MM-DD
    order_reference: orderData.invoiceNo,
    service: "Shipglobal Direct",  // Hardcoded service code
    package_weight: parseFloat(orderData.weight),  // Weight in KG
    package_length: orderData.length || '10',  // Length in CM
    package_breadth: orderData.width || '10',  // Width in CM
    package_height: orderData.height || '10',  // Height in CM
    currency_code: orderData.invoiceCurrency || 'USD',  // Currency code
    csb5_status: 0,
    customer_shipping_firstname: orderData.firstName,
    customer_shipping_lastname: orderData.lastName,
    customer_shipping_mobile: orderData.mobile,
    customer_shipping_email: orderData.invoiceName,  // Assuming invoiceName as email
    customer_shipping_address: orderData.address1,
    customer_shipping_address_2: orderData.address2 || '',
    customer_shipping_city: orderData.city,
    customer_shipping_postcode: orderData.pincode,
    customer_shipping_country_code: countryCode.country,  // Using the ISO-2 code from iso-3166-1 library
    customer_shipping_state: orderData.state,
    ioss_number: "", // If available, add the IOSS number
    vendor_order_items: orderData.productItems.map(p => ({
      vendor_order_item_name: p.productName,
      vendor_order_item_sku: "", // Add SKU if available
      vendor_order_item_quantity: p.productQuantity.toString(),
      vendor_order_item_unit_price: p.productPrice.toFixed(2),
      vendor_order_item_hsn: orderData.HSNCode,
      vendor_order_item_tax_rate: "0" // Default to 0 tax rate
    }))
  };

  try {
    const response = await axios.post('https://app.shipglobal.in/apiv1/order/add', shipmentPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic ' + btoa(`${process.env.SG_USERNAME}:${process.env.SG_PASSWORD}`)
      }
    });

    // Return the relevant data from ShipGlobal response
    return response.data;  // Assuming it returns the shipment data you need
  } catch (error) {
    console.error('Shipment API Error:', error.response?.data || error.message);
    throw new Error('ShipGlobal Shipment API call failed');
  }
};
