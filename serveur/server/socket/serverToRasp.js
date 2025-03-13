const io = require('socket.io-client');
const clientSocket = io('https://dynami-raspberry.loca.lt/cam', {
    transports: ['websocket']
});

module.exports = clientSocket;
