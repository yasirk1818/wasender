const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
    // Ye log kis user ka hai
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Message kis number se bheja gaya (Device ka number)
    sentFrom: { type: String, required: true },
    
    // Message kis number par bheja gaya
    sentTo: { type: String, required: true },
    
    // Message ka text kya tha
    message: { type: String, required: true },
    
    // Message ka status kya tha (kaamyaab ya na-kaam)
    status: { type: String, enum: ['sent', 'failed'], required: true },
    
    // Agar fail hua to wajah kya thi
    failureReason: { type: String, default: null }
}, { 
    timestamps: true // Ye automatically 'createdAt' (bhejne ka waqt) add kar dega
});

module.exports = mongoose.model('MessageLog', messageLogSchema);
