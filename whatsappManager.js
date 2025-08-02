// whatsappManager.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const socket = require('./socket'); // Socket.io instance

// Key: sessionId (e.g., 'user123_device1'), Value: WhatsApp Client instance
const clients = new Map();

function initializeClient(sessionId) {
    if (clients.has(sessionId)) return; // Already initialized

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId, dataPath: './sessions' }),
        puppeteer: { headless: true, args: ['--no-sandbox'] }
    });

    client.on('qr', (qr) => {
        // QR code ko frontend pr bhejen
        console.log(`QR for ${sessionId}:`, qr);
        socket.getIO().emit('qr_code', { sessionId, qr });
        // DB me status update krein -> 'needs_qr'
    });

    client.on('ready', () => {
        console.log(`${sessionId} is ready!`);
        clients.set(sessionId, client);
        // DB me status update krein -> 'ready'
        // Aur phone number bhi save kr len client.info.wid.user
        socket.getIO().emit('client_ready', { sessionId });
    });
    
    client.on('disconnected', (reason) => {
        console.log(`${sessionId} disconnected!`, reason);
        clients.delete(sessionId);
        // DB me status update krein -> 'disconnected'
    });

    client.initialize();
}

function getClient(sessionId) {
    return clients.get(sessionId);
}

module.exports = { initializeClient, getClient };
