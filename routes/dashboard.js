const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Device = require('../models/Device');
const whatsappManager = require('../whatsappManager');

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/auth/login');
};

const getToday = () => new Date().setHours(0, 0, 0, 0);

// --- MAIN DASHBOARD ROUTE (GET /) ---
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.redirect('/auth/logout');
        
        const today = getToday();
        const lastSentDay = user.lastSentDate ? new Date(user.lastSentDate).setHours(0, 0, 0, 0) : null;
        if (today !== lastSentDay) {
            user.messagesSentToday = 0;
            User.findByIdAndUpdate(user._id, { messagesSentToday: 0 }).exec();
        }
        
        const devices = await Device.find({ userId: req.session.userId });
        res.render('dashboard', { user, devices });
    } catch (error) {
        console.error("Dashboard loading error:", error);
        res.redirect('/auth/login?message=Error loading dashboard.');
    }
});

// --- ADD DEVICE ROUTE ---
router.post('/add-device', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
        const deviceCount = await Device.countDocuments({ userId: user._id });
        if (deviceCount >= user.deviceLimit) return res.status(403).json({ success: false, message: 'Device limit reached!' });
        const sessionId = `${user._id}_${Date.now()}`;
        await new Device({ userId: user._id, sessionId, status: 'loading' }).save();
        whatsappManager.initializeClient(sessionId);
        res.status(200).json({ success: true, message: 'Device initialization started.' });
    } catch (error) {
        console.error("Add device error:", error);
        res.status(500).json({ success: false, message: 'Server error while adding device.' });
    }
});


// ===== MUKAMMAL RECONNECT LOGIC =====
router.post('/reconnect-device', isAuthenticated, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID is required.' });
        
        const device = await Device.findOne({ sessionId: sessionId, userId: req.session.userId });
        if (!device) return res.status(404).json({ success: false, message: 'Device not found or access denied.' });
        
        console.log(`Reconnect request for session: ${sessionId}`);
        whatsappManager.initializeClient(sessionId);
        res.status(200).json({ success: true, message: 'Reconnection process started.' });
    } catch (error) {
        console.error('Reconnect device error:', error);
        res.status(500).json({ success: false, message: 'Server error during reconnection.' });
    }
});

// ===== MUKAMMAL DELETE LOGIC =====
router.post('/delete-device', isAuthenticated, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID is required.' });

        const device = await Device.findOneAndDelete({ sessionId: sessionId, userId: req.session.userId });
        if (!device) return res.status(404).json({ success: false, message: 'Device not found or already deleted.' });

        const sessionFolderPath = path.join(__dirname, '..', 'sessions', `session-${sessionId}`);
        if (fs.existsSync(sessionFolderPath)) {
            fs.rm(sessionFolderPath, { recursive: true, force: true }, (err) => {
                if(err) console.error("Failed to delete session folder:", err);
                else console.log(`Session folder ${sessionFolderPath} deleted.`);
            });
        }
        res.status(200).json({ success: true, message: 'Device deleted successfully.' });
    } catch (error) {
        console.error('Delete device error:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting.' });
    }
});


// --- MUKAMMAL MESSAGE SENDING LOGIC ---
const checkAndUpdateMessageCount = async (userId, messagesToSend = 1) => {
    try {
        const user = await User.findById(userId);
        if (!user) return false;

        const today = getToday();
        const lastSentDay = user.lastSentDate ? new Date(user.lastSentDate).setHours(0, 0, 0, 0) : null;
        let sentToday = (today === lastSentDay) ? user.messagesSentToday : 0;

        if (sentToday + messagesToSend > user.smsSendLimit) return false;

        const updates = { $inc: { messagesSentToday: messagesToSend }, $set: { lastSentDate: new Date() } };
        if (today !== lastSentDay) {
            updates.$set.messagesSentToday = messagesToSend;
            delete updates.$inc;
        }
        await User.findByIdAndUpdate(userId, updates);
        return true;
    } catch (error) {
        console.error("Error in checkAndUpdateMessageCount:", error);
        return false;
    }
};

// --- SINGLE MESSAGE SEND ROUTE ---
router.post('/send-single', isAuthenticated, async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).json({ success: false, message: 'Number and message are required.' });

    try {
        const canSend = await checkAndUpdateMessageCount(req.session.userId, 1);
        if (!canSend) return res.status(403).json({ success: false, message: 'Daily SMS limit reached!' });

        const readyDevice = await Device.findOne({ userId: req.session.userId, status: 'ready' });
        if (!readyDevice) return res.status(400).json({ success: false, message: 'No active WhatsApp device found.' });

        const client = whatsappManager.getClient(readyDevice.sessionId);
        if (!client) return res.status(500).json({ success: false, message: 'Client instance not found. Please try reconnecting.' });

        const sendMessagePromise = client.sendMessage(`${number.replace(/\D/g, '')}@c.us`, message);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Message sending timed out after 30 seconds.')), 30000));
        
        await Promise.race([sendMessagePromise, timeoutPromise]);
        
        res.json({ success: true, message: `Message sent successfully to ${number}!` });
    } catch (error) {
        console.error("Single send error:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to send message.' });
    }
});

// --- BULK MESSAGE SEND ROUTE ---
router.post('/send-bulk', isAuthenticated, async (req, res) => {
    const { numbers, message } = req.body;
    if (!numbers || !message) return res.status(400).json({ success: false, message: 'Number list and message are required.' });

    try {
        const numberList = numbers.split('\n').map(n => n.trim()).filter(n => n);
        if(numberList.length === 0) return res.status(400).json({ success: false, message: 'No numbers provided.' });

        const canSend = await checkAndUpdateMessageCount(req.session.userId, numberList.length);
        if (!canSend) return res.status(403).json({ success: false, message: 'This bulk request exceeds your daily SMS limit!' });

        const user = await User.findById(req.session.userId);
        const userDevices = await Device.find({ userId: req.session.userId, status: 'ready' });
        if (userDevices.length === 0) return res.status(400).json({ success: false, message: 'No active devices found.' });

        res.json({ success: true, message: `Bulk sending started for ${numberList.length} numbers.` });
        
        // Background sending logic
        (async () => {
            const messagesPerDevice = user.messagesPerDevice || 30;
            const delayBetweenDevicesMs = (user.deviceSwitchDelay || 60) * 1000;
            let deviceIndex = 0, messageCountOnCurrentDevice = 0;
            for (const number of numberList) {
                const client = whatsappManager.getClient(userDevices[deviceIndex].sessionId);
                if (client) {
                    try {
                        const sendMessagePromise = client.sendMessage(`${number.replace(/\D/g, '')}@c.us`, message);
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
                        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 5000 + 3000))); // 3-8s delay
                        await Promise.race([sendMessagePromise, timeoutPromise]);
                        console.log(`[BULK] Sent to ${number}`);
                        messageCountOnCurrentDevice++;
                        if (messageCountOnCurrentDevice >= messagesPerDevice && numberList.indexOf(number) < numberList.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, delayBetweenDevicesMs));
                            messageCountOnCurrentDevice = 0;
                            deviceIndex = (deviceIndex + 1) % userDevices.length;
                        }
                    } catch (err) { console.error(`[BULK] Failed to send to ${number}:`, err.message); }
                }
            }
            console.log('[BULK] Bulk sending process finished.');
        })();
    } catch (error) {
        console.error("Bulk send setup error:", error);
    }
});

module.exports = router;
