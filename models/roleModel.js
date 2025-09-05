// models/roleModel.js
import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  tab: { type: String, required: true },    // query parameter tab
  label: { type: String, required: true },  // display text
  icon: { type: String, required: true },   // lucide icon name
  order: { type: Number, default: 0 },
  enabled: { type: Boolean, default: false } // toggle by SuperAdmin
});

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // SuperAdmin, Operator, PickupStaff
  description: { type: String },
  permissions: [permissionSchema]
});

const Role = mongoose.model('Role', roleSchema);
export default Role;