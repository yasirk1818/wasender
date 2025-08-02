const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const MessageLog = require('../models/MessageLog'); // Yaqeen krein ke ye path a-ok hai

// Middleware to protect routes (is file ke andar hi define krein)
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    // Agar session nahi hai, to login page par bhej den
    res.redirect('/auth/login');
};

// ===== MAIN REPORTS PAGE (GET /) - YAHAN PAR ASAL FIX HAI =====
router.get('/', isAuthenticated, async (req, res) => {
    console.log("--- REPORTS (GET /) ROUTE TRIGGERED ---");
    try {
        console.log("Step 1: Fetching logs from database for user:", req.session.userId);
        
        // Database se logs nikalen
        const logs = await MessageLog.find({ userId: req.session.userId })
            .sort({ createdAt: -1 }) // Naye walay pehle
            .limit(100); // Sirf 100 recent logs dikhayen taake page fast load ho

        console.log(`Step 2: Found ${logs.length} logs. Rendering the page...`);
        
        // 'reports.ejs' view ko render karke browser ko bhejen
        res.render('reports', { logs: logs });
        
        console.log("Step 3: Page rendered successfully.");

    } catch (error) {
        console.error("--- FATAL ERROR IN /reports ROUTE ---", error);
        res.status(500).send("A server error occurred while fetching reports. Please try again later.");
    }
});


// ===== EXPORT TO PDF ROUTE (GET /export-pdf) =====
router.get('/export-pdf', isAuthenticated, async (req, res) => {
    console.log("--- EXPORT PDF ROUTE TRIGGERED ---");
    try {
        const logs = await MessageLog.find({ userId: req.session.userId }).sort({ createdAt: -1 });
        const templatePath = path.join(__dirname, '..', 'views', 'pdf-report-template.ejs');
        const html = await ejs.renderFile(templatePath, { logs: logs });
        
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
        const page = await browser.newPage();
        
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=whatsapp-reports.pdf');
        res.send(pdfBuffer);
        
        console.log("PDF report generated and sent successfully.");

    } catch (error) {
        console.error("--- PDF EXPORT ERROR ---", error);
        res.status(500).send("Could not generate PDF report.");
    }
});


module.exports = router;
