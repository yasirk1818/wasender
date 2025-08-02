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

// Middleware: Check if user is an admin
const isAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        return res.status(403).send('Access Forbidden: You are not an admin.');
    }
    next();
};

// Use these middlewares for all routes in this file
router.use(isAuthenticated);
router.use(isAdmin);

// Route to display all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({});
        // Pass a temporary message if one exists in the session (after an update)
        const message = req.session.message;
        delete req.session.message; // Clear the message after displaying it once

        res.render('admin/users', { 
            layout: false, // Assuming you don't have a main layout file
            users: users,
            message: message 
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server Error');
    }
});

// Route to show the edit user form
router.get('/edit-user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('admin/edit-user', { 
            layout: false,
            user: user
        });
    } catch (error) {
        console.error('Error fetching user for edit:', error);
        res.status(500).send('Server Error');
    }
});

// Route to handle the user update
router.post('/edit-user/:id', async (req, res) => {
    try {
        const { expiryDate, status, deviceLimit, smsSendLimit } = req.body;
        
        await User.findByIdAndUpdate(req.params.id, {
            expiryDate,
            status,
            deviceLimit: Number(deviceLimit),
            smsSendLimit: Number(smsSendLimit)
        });

        // Set a success message in the session
        req.session.message = { type: 'success', text: 'User updated successfully!' };
        res.redirect('/admin/users');

    } catch (error) {
        console.error('Error updating user:', error);
        req.session.message = { type: 'error', text: 'Failed to update user.' };
        res.redirect('/admin/users');
    }
});

module.exports = router;
