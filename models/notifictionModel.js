import {Schema, mongoose} from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, // Who should receive this notification

  type: {
    type: String,
    enum: ['dispute', 'order_update', 'manifest_update', 'general'],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  link: {
    type: String,
    required: false // Optional: URL to redirect client
  },

  isRead: {
    type: Boolean,
    default: false
  },

  
},

    { timestamps: true }

);

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;
