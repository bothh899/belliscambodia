// នេះជា Backend Code (Vercel Serverless Function) 
// វារត់នៅលើ Server មិនមែនលើ Browser ទេ ទើបធានាថាមិនមានបញ្ហា CORS ឡើយ!

export default async function handler(req, res) {
    // អនុញ្ញាតឲ្យរាល់ Website ទាំងអស់អាចហៅ API នេះបាន (ដោះស្រាយបញ្ហា CORS ទាំងស្រុង)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // ប្រសិនបើ Browser គ្រាន់តែមកសួរផ្លូវ (OPTIONS) យើងអនុញ្ញាតឲ្យចូល
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // ទទួលយកតែសំណួរប្រភេទ POST ប៉ុណ្ណោះ
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { md5Hash } = req.body;
        // Token នេះនឹងត្រូវលាក់នៅលើ Server សុវត្ថិភាព ១០០%
        const BAKONG_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiYzNkNjhjOTRhMjE5NDU0OCJ9LCJpYXQiOjE3ODIyOTM1NDksImV4cCI6MTc5MDA2OTU0OX0.yLT9ZKanGQ-GMyq-_I4cKgVjCmXaIhTLZvceoTYY0Hw";
        const BAKONG_API_URL = "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";

        // Server របស់យើងជាអ្នកទៅសួរធនាគារជាតិដោយផ្ទាល់ (ធានាមិនជាប់ Block)
        const response = await fetch(BAKONG_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BAKONG_TOKEN}`
            },
            body: JSON.stringify({ md5: md5Hash })
        });

        const data = await response.json();
        
        // បញ្ជូនលទ្ធផលពីធនាគារជាតិ ត្រឡប់ទៅឲ្យវេបសាយ (Frontend) របស់អ្នកវិញ
        res.status(200).json(data);

    } catch (error) {
        console.error("Backend API Error:", error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}