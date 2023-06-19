const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const https = require('https');
const http = require('http');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const cors = require('cors');
const multer = require('multer');
const childProcess = require('child_process');

const { ChatOpenAI } = require('langchain/chat_models/openai');
const { HumanChatMessage, SystemChatMessage } = require('langchain/schema');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.round() * 1e9)}`;
        const extension = path.extname(file.originalname);
        cb(null, `audio_${uniqueSuffix}${extension}.webm`);
    }
});

const upload = multer({ storage });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({}));

const privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const creds = { key: privateKey, cert: certificate };
const server = https.createServer(creds, app);
const unsecured = http.createServer(app);

const whisperPath = path.resolve('pyenv/Scripts/whisper.exe');
const modelType = "small.en";

const chatTitle = new ChatOpenAI({ temperature: 1.0, openAIApiKey: process.env.OPENAI_API_KEY });
const chatDescription = new ChatOpenAI({ temperature: 0.8, openAIApiKey: process.env.OPENAI_API_KEY });

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function handleIdea(information) {
    console.log(`[+] - Processing idea...`);
    const title = await chatTitle.call([
        new SystemChatMessage(
            `You are a professional business developer and entrepreneur. You specialize in creating short, unique and professional business names. You respond with ONLY with the business title.`
        ),
        new HumanChatMessage(`Create a business title for the transcribed idea below\n\n"${information}"`),
    ]);
    const description = await chatDescription.call([
        new SystemChatMessage(
            `You are a professional business developer and entrepreneur. You specialize in creating short meaningful descriptions of what a business does and how it works. You respond with ONLY descriptions between 25 to 75 words.`
        ),
        new HumanChatMessage(`Create a business description for the transcribed idea below\n\n"${information}"`),
    ]);
    const tasks = await chatDescription.call([
        new SystemChatMessage(
            `You are a professional business developer and entrepreneur. You specialize in creating a list of tasks necessary to get a prototype of the business of the ground. You may speak about marketing and other structures, but your main focus is the technical aspect of the business. You respond with ONLY a numbered list of the tasks to complete in order of completion, with a maximum of 10 tasks.`
        ),
        new HumanChatMessage(`Create a task list for the transcribed idea below\n\n"${information}"`),
    ]);
    console.log(`${title.text} -> ${description.text}\n\n${tasks.text}`);
}

app.get('/', function (req, res) {
    res.send(JSON.stringify({ status: "OK" }));
    res.end();
});

app.post('/', function (req, res) {
    let params = req.body.params;
    res.send();
    res.end();
});

app.post('/upload', upload.single('audio'), (req, res) => {
    console.log('Audio file:', req.file);
    const filePath = path.resolve(req.file.path);
    childProcess.exec(`${whisperPath} --fp16 False --output_format txt --model ${modelType} ${filePath}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        const lines = stdout.split("\n");
        let text = [];
        lines.forEach((line) => {
            if (line.trim() != '') {
                console.log(`[!] - ${line}`);
                text.push(line.split("] ")[1]);
            }
        });
        fs.unlinkSync(filePath);
        handleIdea(text.join(" "));
    });
    console.log("[+] - New audio upload! Transcribing...")
    res.json({ message: 'Audio file uploaded successfully' });
});

server.listen(8080, () => {
    console.log(`Server running on port 8080`);
});
unsecured.listen(8081, () => {
    console.log(`Insecure server running on port 8081`);
});