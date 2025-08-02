// --- External Modules ---
const express = require('express');
const mongoose = require('mongoose');
const path = 'path';
const session = require('express-session');
const http = require('http');

// --- Initialize App and Server ---
const app = express();
// Hum http server is liye bana rahay hain taake Socket.IO is k sath attach ho sakay
const server = http.createServer(app); 

// --- Socket.IO Initialization ---
// Hum ne socket.io ki logic alag file me rakhi hai taake code saaf rahay
const socketManager = require('./socket');
socketManager.init(server);

// --- Database Connection (Local MongoDB) ---
mongoose.connect('mongodb://localhost:27017/whatsapp_sender', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully!');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Agar DB connect na ho to application band kr den
});

// --- Middlewares ---

// Form data (POST requests) ko parhne k liye
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (CSS, client-side JS, images) serve krne k liye 'public' folder se
app.use(express.static(path.join(__dirname, 'public')));

// View Engine (EJS) Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Management (User login state ko yaad rakhne k liye)
app.use(session({
    secret: 'a-very-strong-and-long-secret-key-for-security', // Production me isay zaroor change krein
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Development me false rakhen. Production me HTTPS k sath 'true' krein.
        maxAge: 24 * 60 * 60 * 1000 // 1 din ka session
    }
}));


// --- Routes ---

// Route files ko import krein
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
// const adminRoutes = require('./routes/admin'); // Jab admin panel banayenge to isay uncomment krengy

// Express ko batayen k kon sa URL path kis route file ko istemal krega
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
// app.use('/admin', adminRoutes);

// Root URL ('/') Route - Behter logic k sath
app.get('/', (req, res) => {
    // Agar user pehle se logged in hai to usay dashboard pr bhej den
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    // Agar logged in nahi hai to login page pr bhej den
    res.redirect('/auth/login');
});


// --- Start the Server ---
const PORT = process.env.PORT || 3000;
// Hum `server.listen` use krengy na k `app.listen` taake Socket.IO sahi se kaam kre
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
