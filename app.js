// dotenv ko shuru me require krein (agar aap .env file use kar rahe hain)
require('dotenv').config({ quiet: true });

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const http = require('http');

const app = express();
const server = http.createServer(app);

const socketManager = require('./socket');
socketManager.init(server);

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp_sender', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected successfully!'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Session Configuration ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-that-is-long',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Production me isay 'true' krein agar HTTPS hai
        maxAge: 24 * 60 * 60 * 1000 // 1 din
    }
}));

// --- Global Middleware for User Info in Views ---
app.use((req, res, next) => {
    res.locals.currentUser = req.session.userId ? { id: req.session.userId, role: req.session.role } : null;
    next();
});

// --- Routes ---
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports'); // reportsRoutes ko import krein

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/settings', settingsRoutes);

// ===== YAHAN PAR ASAL FIX HAI =====
// 'pp.use' ki jagah 'app.use' hona chahiye tha
app.use('/reports', reportsRoutes); 
// ===================================

// --- Root Route ---
app.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.redirect('/auth/login');
});

// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
