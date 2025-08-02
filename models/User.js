const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // ... (username, password, role, status, expiryDate, deviceLimit, smsSendLimit, messagesPerDevice, deviceSwitchDelay fields wesy hi rahengi)
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    expiryDate: { type: Date, required: true },
    deviceLimit: { type: Number, default: 1 },
    smsSendLimit: { type: Number, default: 1000 },
    messagesPerDevice: { type: Number, default: 30 },
    deviceSwitchDelay: { type: Number, default: 60 },
    
    // --- NEW COUNTER FIELDS ---
    messagesSentToday: {
        type: Number,
        default: 0
    },
    lastSentDate: {
        type: Date,
        default: null
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
