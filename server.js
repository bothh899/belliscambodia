// File: server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// បើកសិទ្ធិ CORS ឱ្យផ្ទាំង Frontend (Amplify) អាចហៅចូលបាន
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ផ្លូវ API សម្រាប់ដេញឆែកលុយបាគង
app.post('/api/check-bakong', async (req, res) => {
    try {
        const md5Hash = req.body?.md5Hash;
        if (!md5Hash) {
            return res.status(400).json({ error: 'Missing md5Hash parameter' });
        }

        const BAKONG_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiYzNkNjhjOTRhMjE5NDU0OCJ9LCJpYXQiOjE3ODIyOTM1NDksImV4cCI6MTc5MDA2OTU0OX0.yLT9ZKanGQ-GMyq-_I4cKgVjCmXaIhTLZvceoTYY0Hw";
        const BAKONG_API_URL = "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";

        // ហៅទៅកាន់ API ផ្លូវការរបស់ធនាគារជាតិបាគង
        const response = await fetch(BAKONG_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BAKONG_TOKEN}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify({ md5: md5Hash })
        });

        const responseText = await response.text();
        let data = {};
        
        try {
            data = JSON.parse(responseText);
        } catch(e) {
            data = { responseMessage: responseText };
        }

        // ការពារករណីបាគង Firewall ប្លុក (403)
        if (!response.ok) {
            console.log(`Bakong WAF Status: ${response.status}`);
            return res.json({ 
                responseCode: 1, 
                responseMessage: `Bakong WAF Blocked (403). Require IP Whitelisting.` 
            });
        }

        return res.json(data);

    } catch (error) {
        console.error("Backend Error:", error);
        return res.json({ responseCode: 1, responseMessage: error.message });
    }
});

// បើក Server ឱ្យដំណើរការលើ Port 3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});