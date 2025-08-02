const express = require('express');
const router = express.Router();

// Login page dikhane k liye route
router.get('/login', (req, res) => {
    // Abhi k liye hum sirf text bhej rahay hain
    // Baad me yahan EJS file render krengy
    res.send("This is the Login Page");
});

module.exports = router;
