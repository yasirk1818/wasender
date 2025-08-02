const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // User model ko import krein

// --- Registration Routes ---

// Register page dikhane k liye
router.get('/register', (req, res) => {
    res.render('register', { message: null }); // register.ejs ko render krein
});

// Register form submit krne pr
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check krein k user pehle se exist krta hai ya nahi
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.render('register', { 
                message: { type: 'error', text: 'Username already exists!' } 
            });
        }

        // Password ko hash krein
        const hashedPassword = await bcrypt.hash(password, 10);

        // Naye user ka data tayyar krein
        const newUser = new User({
            username,
            password: hashedPassword,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 din ki expiry
        });

        // User ko database me save krein
        await newUser.save();

        // Success message k sath login page pr bhej den
        res.render('login', { 
            message: { type: 'success', text: 'Registration successful! Please login.' } 
        });

    } catch (error) {
        console.error(error);
        res.render('register', { 
            message: { type: 'error', text: 'An error occurred during registration.' } 
        });
    }
});


// --- Login Routes ---

// Login page dikhane k liye
router.get('/login', (req, res) => {
    res.render('login', { message: null }); // login.ejs ko render krein
});

// Login form submit krne pr
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // User ko database me dhondein
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('login', { 
                message: { type: 'error', text: 'Invalid username or password.' } 
            });
        }
        
        // Password match krein
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { 
                message: { type: 'error', text: 'Invalid username or password.' } 
            });
        }

        // Login successful, session create krein
        req.session.userId = user._id;
        req.session.role = user.role;

        // Abhi k liye hum Dashboard pr redirect kr rahay hain (jo aglay step me banega)
        res.redirect('/dashboard');

    } catch (error) {
        console.error(error);
        res.render('login', { 
            message: { type: 'error', text: 'An error occurred during login.' } 
        });
    }
});


// --- Logout Route ---
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard'); // Agar error aye to dashboard pr hi rahay
        }
        res.clearCookie('connect.sid'); // Session cookie ko clear krein
        res.redirect('/auth/login');
    });
});


module.exports = router;
