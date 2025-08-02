const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Username is required'], 
        unique: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'] 
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'],
        default: 'user' 
    },
    status: { 
        type: String, 
        enum: ['active', 'inactive', 'expired'],
        default: 'active' 
    },
    expiryDate: { 
        type: Date, 
        required: true 
    },
    deviceLimit: { 
        type: Number, 
        default: 1 
    },
    smsSendLimit: { 
        type: Number, 
        default: 1000 
    },
    // --- NEW SETTINGS FIELDS ---
    messagesPerDevice: {
        type: Number,
        default: 30 // Default: 30 messages per device before switching
    },
    deviceSwitchDelay: {
        type: Number,
        default: 60 // Default: 60 seconds delay before using the next device
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
