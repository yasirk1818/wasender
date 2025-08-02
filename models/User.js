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
        enum: ['user', 'admin'], // Sirf ye do values ho skti hain
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
    }
}, { timestamps: true }); // createdAt aur updatedAt ki fields automatically add kr dega

module.exports = mongoose.model('User', userSchema);
