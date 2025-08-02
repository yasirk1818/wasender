const mongoose = require('mongoose');
const deviceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String, required: true, unique: true }, // e.g., 'user1_device1'
    phoneNumber: { type: String },
    status: { type: String, default: 'disconnected' } // 'disconnected', 'loading', 'needs_qr', 'ready'
});
module.exports = mongoose.model('Device', deviceSchema);
