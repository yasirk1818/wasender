const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Device = require('../models/Device');
const whatsappManager = require('../whatsappManager');

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/auth/login');
};

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const devices = await Device.find({ userId: req.session.userId });
        if (!user) return res.redirect('/auth/logout');
        res.render('dashboard', { user, devices });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("Error loading dashboard");
    }
});

router.post('/add-device', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const deviceCount = await Device.countDocuments({ userId });
        const user = await User.findById(userId);
        if (deviceCount >= user.deviceLimit) return res.status(403).json({ success: false, message: 'Device limit reached!' });
        const sessionId = `${userId}_${Date.now()}`;
        await new Device({ userId, sessionId, status: 'loading' }).save();
        whatsappManager.initializeClient(sessionId);
        res.status(200).json({ success: true, message: 'Device initialization started.', sessionId });
    } catch (error) {
        console.error("Add device error:", error);
        res.status(500).json({ success: false, message: 'Server error while adding device.' });
    }
});

router.post('/send-single', isAuthenticated, async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).json({ success: false, message: 'Number and message are required.' });
    try {
        const readyDevice = await Device.findOne({ userId: req.session.userId, status: 'ready' });
        if (!readyDevice) return res.status(400).json({ success: false, message: 'No active WhatsApp device found.' });
        const client = whatsappManager.getClient(readyDevice.sessionId);
        if (!client) return res.status(500).json({ success: false, message: 'Client not ready or disconnected.' });
        const chatId = `${number.replace(/\D/g, '')}@c.us`;
        await client.sendMessage(chatId, message);
        res.json({ success: true, message: `Message sent successfully to ${number}!` });
    } catch (error) {
        console.error('Single message sending error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message. Invalid number?' });
    }
});

// --- UPDATED BULK SENDING LOGIC ---
router.post('/send-bulk', isAuthenticated, async (req, res) => {
    const { numbers, message } = req.body;
    if (!numbers || !message) return res.status(400).json({ success: false, message: 'Number list and message are required.' });
    
    try {
        const [user, userDevices] = await Promise.all([
            User.findById(req.session.userId),
            Device.find({ userId: req.session.userId, status: 'ready' })
        ]);

        if (userDevices.length === 0) return res.status(400).json({ success: false, message: 'No active devices found.' });
        
        const numberList = numbers.split('\n').map(n => n.trim()).filter(n => n);
        if (numberList.length === 0) return res.status(400).json({ success: false, message: 'Please provide at least one number.' });

        res.json({ success: true, message: `Bulk sending started for ${numberList.length} numbers using your saved settings.` });

        (async () => {
            // --- USE SETTINGS FROM DB INSTEAD OF HARDCODED VALUES ---
            const messagesPerDevice = user.messagesPerDevice || 30; // Fallback to 30
            const delayBetweenDevicesMs = (user.deviceSwitchDelay || 60) * 1000; // Fallback to 60s and convert to MS
            
            let deviceIndex = 0;
            let messageCountOnCurrentDevice = 0;

            for (const number of numberList) {
                const currentDevice = userDevices[deviceIndex];
                const client = whatsappManager.getClient(currentDevice.sessionId);
                
                if (client) {
                    try {
                        const randomDelay = Math.floor(Math.random() * (10 - 4 + 1) + 4) * 1000;
                        await new Promise(resolve => setTimeout(resolve, randomDelay));
                        const chatId = `${number.replace(/\D/g, '')}@c.us`;
                        await client.sendMessage(chatId, message);
                        console.log(`[BULK] Sent to ${number} from device ${currentDevice.sessionId}`);
                        messageCountOnCurrentDevice++;

                        if (messageCountOnCurrentDevice >= messagesPerDevice && numberList.indexOf(number) < numberList.length - 1) {
                            console.log(`[BULK] Device limit of ${messagesPerDevice} reached. Switching device...`);
                            if (delayBetweenDevicesMs > 0) {
                                await new Promise(resolve => setTimeout(resolve, delayBetweenDevicesMs));
                            }
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
        })();
    } catch (error) {
        console.error('Bulk sending error:', error);
    }
});

module.exports = router;
