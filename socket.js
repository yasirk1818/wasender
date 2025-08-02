// socket.js
let io;

module.exports = {
    init: (httpServer) => {
        io = require('socket.io')(httpServer, {
            cors: {
                origin: "*", // For development, allow all origins
                methods: ["GET", "POST"]
            }
        });
        console.log('Socket.io initialized!');
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
