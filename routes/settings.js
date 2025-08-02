const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware: Check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// Use this middleware for all routes in this file
router.use(isAuthenticated);

// Route to display the settings page
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const message = req.session.message;
        delete req.session.message; // Clear message after showing

        res.render('settings', { 
            user: user,
            message: message
        });
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).send('Server Error');
    }
});

// Route to handle updating the settings
router.post('/', async (req, res) => {
    try {
        const { messagesPerDevice, deviceSwitchDelay } = req.body;
        
        await User.findByIdAndUpdate(req.session.userId, {
            messagesPerDevice: Number(messagesPerDevice),
            deviceSwitchDelay: Number(deviceSwitchDelay)
        });

        req.session.message = { type: 'success', text: 'Settings updated successfully!' };
        res.redirect('/settings');

    } catch (error) {
        console.error('Error updating settings:', error);
        req.session.message = { type: 'error', text: 'Failed to update settings.' };
        res.redirect('/settings');
    }
});

module.exports = router;
