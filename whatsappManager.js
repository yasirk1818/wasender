const { Client, LocalAuth } = require('whatsapp-web.js');
const socket = require('./socket'); // Socket.io instance
const Device = require('./models/Device'); // DB Model

// Key: sessionId, Value: WhatsApp Client instance
const clients = new Map();

async function initializeClient(sessionId) {
    if (clients.has(sessionId)) {
        console.log(`Client ${sessionId} is already initializing or ready.`);
        return;
    }

    console.log(`Initializing client for session: ${sessionId}`);
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId, dataPath: './sessions' }),
        puppeteer: { 
            headless: true, // Server pr true hi hona chahiye
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Server pr zaroori args
        }
    });
    
    // Client ko map me daal den taake dobara na banayen
    clients.set(sessionId, client);

    client.on('qr', async (qr) => {
        console.log(`QR code received for ${sessionId}`);
        // QR code ko frontend pr bhejen
        socket.getIO().emit('qr_code', { sessionId, qr });
        // DB me status update krein
        await Device.findOneAndUpdate({ sessionId }, { status: 'needs_qr' });
    });

    client.on('ready', async () => {
        console.log(`Client for ${sessionId} is ready!`);
        clients.set(sessionId, client); // Ensure it's set on ready
        const phoneNumber = client.info.wid.user;
        // DB me status aur phone number update krein
        await Device.findOneAndUpdate({ sessionId }, { status: 'ready', phoneNumber: phoneNumber });
        // Frontend ko batayen k client ready hai
        socket.getIO().emit('client_ready', { sessionId, phoneNumber });
    });
    
    client.on('disconnected', async (reason) => {
        console.log(`Client for ${sessionId} was disconnected.`, reason);
        clients.delete(sessionId);
        await Device.findOneAndUpdate({ sessionId }, { status: 'disconnected' });
        socket.getIO().emit('client_disconnected', { sessionId });
    });

    client.on('auth_failure', async (msg) => {
        console.error(`Authentication failure for ${sessionId}:`, msg);
        clients.delete(sessionId);
        await Device.findOneAndUpdate({ sessionId }, { status: 'error' });
    });
    
    try {
        await client.initialize();
    } catch (error) {
        console.error(`Failed to initialize client ${sessionId}:`, error);
        clients.delete(sessionId);
        await Device.findOneAndUpdate({ sessionId }, { status: 'error' });
    }
}

// Function to get an active client
function getClient(sessionId) {
    return clients.get(sessionId);
}

module.exports = { initializeClient, getClient };
