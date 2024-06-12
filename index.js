require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const session = require('express-session');
const Groq = require('groq-sdk');
const { MongoClient } = require('mongodb');
const mammoth = require("mammoth");

const app = express();
const port = 3000;

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uri = process.env.MONGODB_URI;
const dbName = 'pdf';

async function processPDF(dataBuffer) {
    const data = await pdfParse(dataBuffer);
    return data.text;
}

async function processDocx(dataBuffer) {
    const { value } = await mammoth.extractRawText({ buffer: dataBuffer });
    return value;
}

async function uploadDocumentToMongoDB(text) {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection('documents');
        await collection.insertOne({ text });
    } finally {
        await client.close();
    }
}

app.post('/upload', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        const pdfTexts = [];

        for (const file of req.files) {
            const dataBuffer = file.buffer;
            const text = await processPDF(dataBuffer);
            pdfTexts.push(text);
            await uploadDocumentToMongoDB(text);
        }

        req.session.pdfTexts = pdfTexts;
        req.session.messages = [];

        res.json({ message: 'Files uploaded and processed successfully.' });
    } catch (error) {
        console.error('Error during file upload:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.post('/upload-docx', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        const docxTexts = [];

        for (const file of req.files) {
            const dataBuffer = file.buffer;
            const text = await processDocx(dataBuffer);
            docxTexts.push(text);
            await uploadDocumentToMongoDB(text);
        }

        req.session.docxTexts = docxTexts;
        req.session.messages = [];

        res.json({ message: 'Docx files uploaded and processed successfully.' });
    } catch (error) {
        console.error('Error during docx file upload:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.post('/ask', async (req, res) => {
    const userMessage = req.body.message;
    const selectedLanguage = req.body.language || 'en';
    const pdfTexts = req.session.pdfTexts || [];
    const docxTexts = req.session.docxTexts || [];

    const allTexts = [...pdfTexts, ...docxTexts];

    if (allTexts.length === 0) {
        return res.status(400).send('No documents uploaded.');
    }

    if (!req.session.messages) {
        req.session.messages = [];
    }

    req.session.messages.push({ role: "user", content: userMessage });

    try {
        const allText = allTexts.join('\n\n');
        const languageInstruction = selectedLanguage === 'hu' ? "Válaszolj magyarul." : "Respond in English.";
        const messages = [
            { role: "system", content: `You are a helpful assistant. Here are the documents you should reference: ${allText} ${languageInstruction}` },
            ...req.session.messages
        ];

        const chatCompletion = await groq.chat.completions.create({
            "messages": messages,
            "model": "llama3-70b-8192",
            "temperature": 1,
            "max_tokens": 1024,
            "top_p": 1,
            "stream": false,
            "stop": null
        });

        const responseMessage = chatCompletion.choices[0].message.content;
        req.session.messages.push({ role: "assistant", content: responseMessage });

        res.json({ reply: responseMessage });
    } catch (error) {
        console.error('Error during question handling:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
