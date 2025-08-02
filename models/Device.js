const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Ye User model se link hai
        required: true 
    },
    sessionId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    phoneNumber: { 
        type: String,
        default: null
    },
    status: { 
        type: String, 
        enum: ['disconnected', 'loading', 'needs_qr', 'ready', 'error'],
        default: 'disconnected' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
