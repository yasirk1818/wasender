document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Connect to Socket.IO server

    const addDeviceBtn = document.getElementById('add-device-btn');
    const qrModal = document.getElementById('qr-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const qrContainer = document.getElementById('qrcode-container');
    const qrMessage = document.getElementById('qr-message');

    // Show modal when 'Add Device' is clicked
    addDeviceBtn.addEventListener('click', async () => {
        qrContainer.innerHTML = ''; // Clear previous QR
        qrMessage.textContent = 'Requesting QR code...';
        qrModal.style.display = 'flex';

        try {
            const response = await fetch('/dashboard/add-device', { method: 'POST' });
            const data = await response.json();

            if (!data.success) {
                qrMessage.textContent = data.message || 'Failed to start session.';
            }
        } catch (error) {
            qrMessage.textContent = 'Error communicating with the server.';
        }
    });

    // Hide modal
    closeModalBtn.addEventListener('click', () => {
        qrModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target === qrModal) {
            qrModal.style.display = 'none';
        }
    });

    // --- Socket.IO Event Listeners ---

    // Listen for QR code from the server
    socket.on('qr_code', (data) => {
        console.log('QR received for session:', data.sessionId);
        qrMessage.textContent = 'Scan this code with your WhatsApp app.';
        // Generate QR code image
        QRCode.toCanvas(document.getElementById('qrcode-container'), data.qr, { width: 256 }, (error) => {
            if (error) console.error(error);
        });
    });

    // Listen for client ready event
    socket.on('client_ready', (data) => {
        console.log('Client ready:', data.sessionId);
        qrModal.style.display = 'none'; // Hide modal on success
        alert(`Device connected successfully! Phone: ${data.phoneNumber}`);
        // Optionally, refresh the page to show the new device in the list
        window.location.reload(); 
    });

    // Listen for client disconnected event
    socket.on('client_disconnected', (data) => {
        console.log('Client disconnected:', data.sessionId);
        const statusEl = document.getElementById(`status-${data.sessionId}`);
        if(statusEl) {
            statusEl.textContent = 'disconnected';
            statusEl.className = 'device-status status-disconnected';
        }
        alert('A device has been disconnected.');
    });

});
