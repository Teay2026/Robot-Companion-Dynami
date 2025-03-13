const express = require('express');
const localtunnel = require('localtunnel');
const bp = require('body-parser');
require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require("path");
const app = express();
const server = require('http').Server(app);
const ioServer = require('socket.io')(server, { cors: { origin: "*" } });
const clientSocket = require('./socket/serverToRasp');

const PORT = process.env.PORT;
const RASP_URL = process.env.RASP_URL;

app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

let detectionFlag = false;
let isAutopilot = false;

function generateRandomCode(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}
async function generateResponse(message) {
    const API_URL = process.env.API_URL;
    const BOT_ID = process.env.BOT_ID;
    const USER_ID = process.env.USER_ID;

    const headers = {
        "accept": "text/event-stream",
        "content-type": "application/json",
        "cookie": "opengpts_user_id="+USER_ID,
    }
    const body = JSON.stringify({
        input: [
            {
                content: message,
                additional_kwargs:{},
                type: "human",
                example: "false"
            }
        ],
        assistant_id: BOT_ID,
        thread_id: generateRandomCode(),
    });

    const response = await fetch(API_URL, {
        "method": "POST",
        "mode": "cors",
        "credentials": "include",
        headers,
        body,
    });

    if (!response.ok) { throw new Error("failed to fetch data") }
    
    const reader = response.body.getReader();
    let dataChunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder("utf-8").decode(value);
        const lines = chunk.split("\n");
        lines.forEach((line) => {
            if (line.trim() === "" || line.includes("event: ")) return;
            dataChunks.push(line);
        });
    }
    return extractJson(dataChunks);
}
function extractJson(data) {
    let index = 0;
    let lastIndex = -1;
    while(lastIndex == -1) {
        index++;
        lastIndex = data[data.length - index].lastIndexOf('{"content":');
    }

    let reconstructedData = data[data.length - index].substring(lastIndex).replace("]", "");

    index--;
    if(index > 0) {
        reconstructedData += data[data.length - 1];
    }
    
    const cleanedData = reconstructedData.trim().replace("]", "");
    const escapedStr = cleanedData.replace(/"content":"([^"]*)"/g, (match, content) => {
        return `"content":"${content.replace(/\n/g, '\\n')}"`;
    });
    const jsonData = JSON.parse(escapedStr);

    return jsonData;
}
function detectionCallback(){
    console.log("detection callback");
    const detectionProcess = spawn('python3', ["./scripts/detect.py", "./image.jpg"]);
    detectionProcess.stdout.on('data', (data) => {
        console.log(data.toString());
        detectionFlag = false;
    });
    detectionProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
}
function autopilotLoop(stream){
    if(isAutopilot && !detectionFlag){
        detectionFlag = true;
        var bytes = new Uint8Array(stream);
        var dataBuffer = Buffer.from(bytes.buffer);
    
        fs.writeFile('image.jpg', dataBuffer, (err) => {
            if (err) throw err;
            console.log('image saved');
            detectionCallback();
        });
    }
}


app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html'});
    res.end('Server OK');
});
app.get('/raspberry', async (req, res) => {
    const result = await fetch(RASP_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if(result.ok){
        res.writeHead(200, { 'Content-Type': 'text/html'});
        res.end('Online');
    } else {
        res.writeHead(500, { 'Content-Type': 'text/html'});
        res.end('Offline');
    }
});
app.get('/test', async (req, res) => {
    const result = await fetch(RASP_URL+"/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "avance" }),
    });
    res.send(result.ok);
});

app.post('/api/honk', async (req, res) => {
    const args = req.body;
    console.log(args.honk);
    await fetch(RASP_URL+"/honk");
    res.writeHead(200, { 'Content-Type': 'text/html'});
    res.end('Online');
});
app.post('/api/chat', async (req, res) => {
    const args = req.body;
    const result = await generateResponse(args.message);

    const pythonProcess = spawn('python3', ["./scripts/tts.py", result.content]);

    pythonProcess.stdout.on('data', async () => {
        fs.readFile('output.mp3', (err, data) => {
            if (err) {
            console.error(err);
            return;
        }
        
        const base64Data = data.toString('base64');

        fetch(RASP_URL+"/infer", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audioData: base64Data,
            }),
        })
          .then(response => response.text())
          .then(data => console.log(data))
          .catch(error => console.error(error));
        });
        console.log(result.content);
        res.send(result.content);
    });
});
app.post('/api/move', async (req, res) => {
    const args = req.body;
    console.log(args);
    
    const result = await fetch(RASP_URL+"/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: args.direction }),
    });
    
    res.send(result.ok);
});
app.post('/api/autopilot', async (req, res) => {
    const args = req.body;
    isAutopilot = args.autoPilot;
    console.log(args);
    res.send("autopilot");
});
app.get("/image", (req, res) => {
    res.sendFile(path.join(__dirname, 'image.html'));
});

var ns = ioServer.of('/cam');
ns.on('connection', (socket) => {
    console.log('Application connectée');
    detectionFlag = false;

    clientSocket.on("data", (stream) => { 
        socket.emit("data", stream)
        autopilotLoop(stream);
    });

    socket.on('disconnect', () => {
        console.log('Application déconnecté')
        detectionFlag = true;
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
(async () => {
    const tunnel = await localtunnel({ port: PORT, subdomain: "dynami-api" });
    const password = await fetch("https://ipv4.icanhazip.com").then(data => data.text());
    console.log(`Tunnel URL: ${tunnel.url}\nTunnel password: ${password}`);
    tunnel.on('close', () => { console.log("Tunnel closed.") });
})();
