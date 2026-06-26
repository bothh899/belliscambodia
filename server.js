// File: server.js
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

// 🔴 ១. ដំឡើង Firebase Admin (ភ្ជាប់ Server ទៅកាន់ Database)
// លោកអ្នកត្រូវទាញយក file "serviceAccountKey.json" ពី Firebase Console មកដាក់ក្បែរ file server.js នេះ
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 🔴 ២. ដំឡើង Telegram Bot
const BOT_TOKEN = '8862983985:AAF-zbj6y5MwbH0HyFbWwh2jdd10BswtUAc'; // ដាក់ Token លោកអ្នកនៅទីនេះ
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const app = express();
const PORT = 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==========================================
// 🟢 មុខងារទី ១៖ ការឆែកលុយបាគង (កូដដើមរបស់លោកអ្នក)
// ==========================================
app.post('/api/check-bakong', async (req, res) => {
    try {
        const md5Hash = req.body?.md5Hash;
        if (!md5Hash) {
            return res.status(400).json({ error: 'Missing md5Hash parameter' });
        }

        const BAKONG_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiYzNkNjhjOTRhMjE5NDU0OCJ9LCJpYXQiOjE3ODIyOTM1NDksImV4cCI6MTc5MDA2OTU0OX0.yLT9ZKanGQ-GMyq-_I4cKgVjCmXaIhTLZvceoTYY0Hw";
        const BAKONG_API_URL = "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";

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

// ==========================================
// 🟢 មុខងារទី ២៖ ចាប់យកការចុចប៊ូតុងពី Telegram
// ==========================================
bot.on('callback_query', async (query) => {
    const data = query.data; // វានឹងចាប់បានពាក្យ "prep_ORD-1234"
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (data.startsWith('prep_')) {
        const orderId = data.split('_')[1]; // កាត់យកលេខកូដវិក្កយបត្រ (ឧទាហរណ៍៖ ORD-1234)

        try {
            // ១. ស្វែងរកវិក្កយបត្រនោះនៅក្នុង Firebase
            const ordersRef = db.collection('orders');
            const snapshot = await ordersRef.where('orderId', '==', orderId).get();

            if (snapshot.empty) {
                // បើរកមិនឃើញ លោតសារប្រាប់ Error
                return bot.answerCallbackQuery(query.id, { text: `រកមិនឃើញវិក្កយបត្រ ${orderId} ទេ!`, show_alert: true });
            }

            // ២. ធ្វើការ Update Status ទៅជា 'Preparing & shipping'
            const docId = snapshot.docs[0].id;
            await ordersRef.doc(docId).update({ status: 'Preparing & shipping' });

            // ៣. លោតសារខ្វាច់ប្រាប់បុគ្គលិកថា Update ជោគជ័យ (បញ្ឈប់ការវិល Loading)
            await bot.answerCallbackQuery(query.id, { text: `✅ បាន Update អីវ៉ាន់ ${orderId} ទៅជា Preparing & shipping!` });

            // ៤. ដកប៊ូតុងចេញពីសារ Telegram ដើម្បីកុំឱ្យគេចុចជាន់គ្នាលើកទី ២
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });

            // ៥. (ជាជម្រើស) លោតសារប្រាប់មួយទៀតទៅក្នុង Group
            await bot.sendMessage(chatId, `✅ <b>អីវ៉ាន់ ${orderId} កំពុងត្រូវបានរៀបចំ!</b>`, { parse_mode: "HTML" });

        } catch (error) {
            console.error('Error updating order from Telegram:', error);
            await bot.answerCallbackQuery(query.id, { text: '❌ មានបញ្ហាក្នុងការ Update ទៅកាន់ Database!', show_alert: true });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Telegram Bot is listening for actions...`);
});