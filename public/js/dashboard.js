// Pehle yaqeen banayen ke poora HTML document load ho chuka hai
document.addEventListener('DOMContentLoaded', () => {

    // --- Step 1: Check for required libraries ---
    if (typeof io === 'undefined' || typeof QRCode === 'undefined') {
        console.error('CRITICAL ERROR: A required library (Socket.IO or QRCode.js) is not loaded!');
        return; // Stop script execution
    }

    // --- Step 2: Initialize Socket.IO ---
    const socket = io();
    socket.on('connect', () => { console.log('%cSocket.IO Connected Successfully!', 'color: green;'); });
    socket.on('connect_error', (err) => { console.error('%cSocket.IO Connection Failed!', 'color: red;', err); });

    // --- Step 3: Select all HTML Elements (Sirf aik baar) ---
    const addDeviceBtn = document.getElementById('add-device-btn');
    const qrModal = document.getElementById('qr-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const qrContainer = document.getElementById('qrcode-container');
    const qrMessage = document.getElementById('qr-message');
    const deviceListContainer = document.getElementById('device-list-container');
    const singleMessageForm = document.getElementById('single-message-form');
    const bulkMessageForm = document.getElementById('bulk-message-form');
    const messageStatusDiv = document.getElementById('message-status');

    // --- Step 4: Helper Function ---
    const showStatusMessage = (message, type = 'success') => {
        if (!messageStatusDiv) return;
        messageStatusDiv.textContent = message;
        messageStatusDiv.className = `message ${type}`;
        messageStatusDiv.style.display = 'block';
        setTimeout(() => { messageStatusDiv.style.display = 'none'; }, 5000);
    };

    // --- Step 5: Attach All Event Listeners ---

    // === A. "ADD DEVICE" BUTTON CLICK (MUKAMMAL LOGIC) ===
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', async () => {
            if (!qrModal) return console.error('QR Modal not found in HTML.');
            
            qrContainer.innerHTML = '';
            qrMessage.textContent = 'Requesting QR code...';
            qrModal.style.display = 'flex';

            try {
                const response = await fetch('/dashboard/add-device', { method: 'POST' });
                const data = await response.json();
                if (!data.success) {
                    qrMessage.textContent = data.message || 'Failed to start a new session.';
                }
            } catch (error) {
                console.error('Add device fetch error:', error);
                qrMessage.textContent = 'Error: Could not communicate with server.';
            }
        });
    }

    // === B. CLOSE MODAL EVENTS (MUKAMMAL LOGIC) ===
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => { qrModal.style.display = 'none'; });
    }
    window.addEventListener('click', (event) => {
        if (event.target === qrModal) { qrModal.style.display = 'none'; }
    });

    // === C. RECONNECT & DELETE BUTTONS (MUKAMMAL LOGIC) ===
    if (deviceListContainer) {
        deviceListContainer.addEventListener('click', async (e) => {
            const target = e.target;
            const sessionId = target.dataset.sessionId;
            if (!sessionId) return;

            if (target.classList.contains('btn-reconnect')) {
                qrModal.style.display = 'flex';
                qrMessage.textContent = 'Requesting QR for reconnection...';
                await fetch('/dashboard/reconnect-device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
            }

            if (target.classList.contains('btn-delete')) {
                if (confirm('Are you sure you want to delete this device permanently?')) {
                    const response = await fetch('/dashboard/delete-device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
                    if (response.ok) { window.location.reload(); } 
                    else { alert('Failed to delete device.'); }
                }
            }
        });
    }

    // === D. SINGLE MESSAGE FORM SUBMISSION (MUKAMMAL LOGIC) ===
    if (singleMessageForm) {
        singleMessageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = singleMessageForm.querySelector('button');
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
            try {
                const response = await fetch('/dashboard/send-single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
                });
                const result = await response.json();
                showStatusMessage(result.message, result.success ? 'success' : 'error');
                if (result.success) e.target.reset();
            } catch (error) { showStatusMessage('An unexpected server error occurred.', 'error'); } 
            finally { submitButton.disabled = false; submitButton.textContent = 'Send Message'; }
        });
    }

    // === E. BULK MESSAGE FORM SUBMISSION (MUKAMMAL LOGIC) ===
    if (bulkMessageForm) {
        bulkMessageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = bulkMessageForm.querySelector('button');
            submitButton.disabled = true;
            submitButton.textContent = 'Starting...';
            try {
                const response = await fetch('/dashboard/send-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
                });
                const result = await response.json();
                showStatusMessage(result.message, result.success ? 'success' : 'error');
                if (result.success) e.target.reset();
            } catch (error) { showStatusMessage('An unexpected server error occurred.', 'error'); } 
            finally { submitButton.disabled = false; submitButton.textContent = 'Start Bulk Sending'; }
        });
    }

    // --- Step 6: Listen for Socket.IO Events from Server ---
    socket.on('qr_code', (data) => {
        if (!qrContainer || !qrMessage) return;
        console.log('%cEVENT RECEIVED: qr_code', 'color: blue; font-weight: bold;');
        qrContainer.innerHTML = '';
        qrMessage.textContent = 'Scan this code with your WhatsApp app.';
        QRCode.toDataURL(data.qr, { width: 280, margin: 2 }, (err, url) => {
            if (err) return;
            const img = document.createElement('img');
            img.src = url;
            qrContainer.appendChild(img);
        });
    });

    socket.on('client_ready', (data) => {
        if(qrModal) qrModal.style.display = 'none';
        alert(`Device connected: ${data.phoneNumber}`);
        window.location.reload();
    });

    socket.on('client_disconnected', (data) => {
        const statusEl = document.getElementById(`status-${data.sessionId}`);
        if(statusEl) {
            statusEl.textContent = 'disconnected';
            statusEl.className = 'device-status status-disconnected';
        }
    });
});
