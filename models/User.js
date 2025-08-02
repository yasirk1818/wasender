const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // 'user' or 'admin'
    status: { type: String, default: 'active' }, // 'active', 'inactive'
    expiryDate: { type: Date, required: true },
    deviceLimit: { type: Number, default: 1 },
    smsSendLimit: { type: Number, default: 1000 }
});
module.exports = mongoose.model('User', userSchema);
