const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const http = require('http');

const app = express();
const server = http.createServer(app);

const socketManager = require('./socket');
socketManager.init(server);

mongoose.connect('mongodb://localhost:27017/whatsapp_sender', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected successfully!'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'a-very-strong-and-long-secret-key-for-security',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use((req, res, next) => {
    if (req.session.userId) {
        res.locals.currentUser = {
            id: req.session.userId,
            role: req.session.role
        };
    } else {
        res.locals.currentUser = null;
    }
    next();
});

// --- Routes ---
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings'); // NEW: Import settings routes

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/settings', settingsRoutes); // NEW: Use settings routes

app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.redirect('/auth/login');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
