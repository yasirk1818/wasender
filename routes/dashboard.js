const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Device = require('../models/Device');
const whatsappManager = require('../whatsappManager'); // Hum ye file aglay step me banayenge

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
};

// Main Dashboard Page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const devices = await Device.find({ userId: req.session.userId });

        if (!user) {
            return res.redirect('/auth/logout');
        }

        res.render('dashboard', { 
            user: user,
            devices: devices,
            message: null 
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.render('dashboard', { user: {}, devices: [], message: { type: 'error', text: 'Could not load dashboard.' } });
    }
});

// Route to handle "Add Device" request
router.post('/add-device', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const deviceCount = await Device.countDocuments({ userId: userId });
        const user = await User.findById(userId);

        // Check if user has reached device limit
        if (deviceCount >= user.deviceLimit) {
            return res.status(403).json({ success: false, message: 'Device limit reached!' });
        }

        // Create a unique session ID
        const sessionId = `${userId}_${Date.now()}`;
        
        // Create a new device entry in the database
        const newDevice = new Device({
            userId: userId,
            sessionId: sessionId,
            status: 'loading' // Initial status
        });
        await newDevice.save();

        // Start the WhatsApp client initialization
        whatsappManager.initializeClient(sessionId);

        res.status(200).json({ success: true, message: 'Device initialization started. Please scan the QR code.', sessionId: sessionId });

    } catch (error) {
        console.error("Add device error:", error);
        res.status(500).json({ success: false, message: 'Server error while adding device.' });
    }
});


module.exports = router;
