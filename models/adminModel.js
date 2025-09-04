import mongoose, { mongo, Schema } from "mongoose";

const adminSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {type:String, 
        enum : ['superadmin', 'operator', 'delivery'],
        default: 'operator'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
