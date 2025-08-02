const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Device = require('../models/Device');
const whatsappManager = require('../whatsappManager');

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
        res.render('dashboard', { user, devices });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("Error loading dashboard");
    }
});

// Route to handle "Add Device" request
router.post('/add-device', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const deviceCount = await Device.countDocuments({ userId });
        const user = await User.findById(userId);

        if (deviceCount >= user.deviceLimit) {
            return res.status(403).json({ success: false, message: 'Device limit reached!' });
        }

        const sessionId = `${userId}_${Date.now()}`;
        const newDevice = new Device({ userId, sessionId, status: 'loading' });
        await newDevice.save();

        whatsappManager.initializeClient(sessionId);
        res.status(200).json({ success: true, message: 'Device initialization started.', sessionId });
    } catch (error) {
        console.error("Add device error:", error);
        res.status(500).json({ success: false, message: 'Server error while adding device.' });
    }
});

// --- NEW: Route to Send Single Message ---
router.post('/send-single', isAuthenticated, async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ success: false, message: 'Number and message are required.' });
    }

    try {
        const readyDevice = await Device.findOne({ userId: req.session.userId, status: 'ready' });
        if (!readyDevice) {
            return res.status(400).json({ success: false, message: 'No active WhatsApp device found. Please connect a device first.' });
        }

        const client = whatsappManager.getClient(readyDevice.sessionId);
        if (!client) {
            return res.status(500).json({ success: false, message: 'Client not ready or disconnected. Please try again.' });
        }

        const chatId = `${number.replace(/\D/g, '')}@c.us`;
        await client.sendMessage(chatId, message);
        
        res.json({ success: true, message: `Message sent successfully to ${number}!` });

    } catch (error) {
        console.error('Single message sending error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message. The number might be invalid or not on WhatsApp.' });
    }
});

// --- NEW: Route to Send Bulk Messages ---
router.post('/send-bulk', isAuthenticated, async (req, res) => {
    const { numbers, message } = req.body;
    if (!numbers || !message) {
        return res.status(400).json({ success: false, message: 'Number list and message are required.' });
    }

    try {
        const userDevices = await Device.find({ userId: req.session.userId, status: 'ready' });
        if (userDevices.length === 0) {
            return res.status(400).json({ success: false, message: 'No active devices to send messages from.' });
        }
        
        const numberList = numbers.split('\n').map(n => n.trim()).filter(n => n);
        if (numberList.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide at least one number.' });
        }

        // Immediately respond to user, and process sending in the background
        res.json({ success: true, message: `Bulk sending process started for ${numberList.length} numbers. You can continue using the dashboard.` });

        // --- Asynchronous Sending Logic ---
        (async () => {
            // TODO: In the future, get these settings from user's DB profile
            const MESSAGES_PER_DEVICE = 50; 
            const DELAY_BETWEEN_DEVICES_MS = 30000; // 30 seconds
            
            let deviceIndex = 0;
            let messageCountOnCurrentDevice = 0;

            for (const number of numberList) {
                const currentDevice = userDevices[deviceIndex];
                const client = whatsappManager.getClient(currentDevice.sessionId);
                
                if (client) {
                    try {
                        const randomDelay = Math.floor(Math.random() * (10 - 4 + 1) + 4) * 1000; // 4-10 seconds delay
                        await new Promise(resolve => setTimeout(resolve, randomDelay));

                        const chatId = `${number.replace(/\D/g, '')}@c.us`;
                        await client.sendMessage(chatId, message);
                        console.log(`[BULK] Message sent to ${number} from device ${currentDevice.sessionId}`);
                        messageCountOnCurrentDevice++;

                        // Check if we need to switch device
                        if (messageCountOnCurrentDevice >= MESSAGES_PER_DEVICE) {
                            console.log(`[BULK] Device limit reached for ${currentDevice.sessionId}. Switching device...`);
                            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_DEVICES_MS));
                            
                            messageCountOnCurrentDevice = 0;
                            deviceIndex = (deviceIndex + 1) % userDevices.length;
                        }

                    } catch (err) {
                        console.error(`[BULK] Failed to send to ${number}:`, err.message);
                    }
                } else {
                    console.error(`[BULK] Client for device ${currentDevice.sessionId} not found. Skipping.`);
                }
            }
            console.log('[BULK] Bulk sending process finished.');
        })(); // Self-invoking async function

    } catch (error) {
        console.error('Bulk sending error:', error);
        // This response won't be sent if the initial response was already sent, which is fine.
    }
});


module.exports = router;
