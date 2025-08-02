// External Modules
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const http = require('http');
// Placeholder for Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    res.send(`<h1>Welcome to Dashboard!</h1><a href="/auth/logout">Logout</a>`);
});
// Initialize App and Server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io (Real-time communication k liye)
const socketManager = require('./socket'); // Hum ye file abhi banayenge
socketManager.init(server);

// --- Database Connection (Local MongoDB) ---
mongoose.connect('mongodb://localhost:27017/whatsapp_sender', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully!');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// --- Middlewares ---
// Form data handle krne k liye
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (CSS, client-side JS) serve krne k liye
app.use(express.static(path.join(__dirname, 'public')));

// View Engine (EJS) Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Management (User login state ko yaad rakhne k liye)
app.use(session({
    secret: 'my-super-secret-key-for-whatsapp', // Isko production me change krna hai
    resave: false,
    saveUninitialized: true
}));

// --- Routes ---
// TODO: Hum yahan routes add krengy
const authRoutes = require('./routes/auth');
// const adminRoutes = require('./routes/admin');
// const dashboardRoutes = require('./routes/dashboard');

app.use('/auth', authRoutes);
// app.use('/admin', adminRoutes);
// app.use('/', dashboardRoutes);

// Simple Home Route (Login page pr redirect krne k liye)
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});


// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
