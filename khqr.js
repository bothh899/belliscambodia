// ==========================================
// KHQR DYNAMIC & BAKONG API MODULE (SERVERLESS API FIXED)
// ==========================================

let pollingInterval;
let timerInterval;

// 🔴 កូដនេះនឹងហៅទៅកាន់ API Backend (Vercel Serverless Function) របស់យើងផ្ទាល់ 🔴
async function checkTransactionStatus(md5Hash) {
    try {
        // ហៅទៅកាន់ File ដែលយើងទើបបង្កើតអម្បាញ់មិញ (api/check-bakong.js)
        const targetUrl = `/api/check-bakong`;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
                // លែងត្រូវការបញ្ជូន Token ទីនេះទៀតហើយ ព្រោះ Token ត្រូវលាក់នៅ Backend យ៉ាងមានសុវត្ថិភាព
            },
            body: JSON.stringify({ md5Hash: md5Hash }) // ផ្ញើតែ MD5 ទៅ
        });
        
        if (!response.ok) {
            console.error(`HTTP Error! Status: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log("Response from our Backend:", data); 
        return data;
    } catch (error) { 
        console.error("Fetch Error:", error);
        return null; 
    }
}

// អនុគមន៍សម្រាប់គណនា CRC16
function crc16(s) {
    let crc = 0xFFFF;
    for (let c = 0; c < s.length; c++) {
        crc ^= s.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// អនុគមន៍សម្រាប់បង្កើត KHQR តាម Template ពិតរបស់អ្នក
function generateValidKHQR(amountUSD) {
    let amountKHR = Math.round(amountUSD * 4100); 
    let amountStr = String(amountKHR); 
    
    let payload = "";
    payload += "000201"; 
    payload += "010211"; // 11 = Static QR
    
    payload += "15311974011600520446BONG10002312081"; 
    payload += "29230019virakboth_vann@bkrt"; 
    payload += "52045999"; 
    payload += "5303840"; // USD
    
    payload += "54" + String(amountStr.length).padStart(2, '0') + amountStr;
    
    payload += "5802KH"; 
    payload += "5914VIRAKBOTH VANN"; 
    payload += "6010Phnom Penh"; 
    payload += "6304"; 
    
    return payload + crc16(payload);
}

// អនុគមន៍គោលសម្រាប់ចាប់ផ្តើមបង្ហាញ QR
window.startKHQRPayment = async (totalAmount, orderData) => {
    const amountEl = document.getElementById('khqr-total-amount');
    const qrContainer = document.getElementById('qrcode-container');
    const statusEl = document.getElementById('khqr-polling-status');
    const modalEl = document.getElementById('khqr-modal');
    const timerText = document.getElementById('khqr-timer-text');
    const logoEl = document.querySelector('.khqr-logo'); 

    if(!amountEl || !qrContainer || !statusEl || !modalEl) return;

    let amountKHR = Math.round(totalAmount * 4100);
    amountEl.innerHTML = `$${totalAmount.toFixed(2)} <br><span style="font-size:16px; color:#888;">(~ ${amountKHR.toLocaleString()} ៛)</span>`;
    
    qrContainer.innerHTML = "";
    qrContainer.style.opacity = "1";
    statusEl.innerHTML = `<div class="spinner"></div> <span style="color:var(--text-muted);">កំពុងរៀបចំ QR...</span>`;
    modalEl.classList.add('active');

    // Secret Bypass 
    if (logoEl) {
        logoEl.onclick = () => {
            console.log("Secret Bypass Clicked");
            clearInterval(pollingInterval);
            clearInterval(timerInterval);
            statusEl.innerHTML = `✅ <span style="color:#4caf50; font-weight:bold;">ទូទាត់ជោគជ័យ (Test Mode)!</span>`;
            if(typeof window.saveOrderToFirebase === 'function') {
                window.saveOrderToFirebase(orderData); 
            }
        };
    }

    try {
        const dynamicKHQRString = generateValidKHQR(totalAmount);
        
        new QRCode(qrContainer, {
            text: dynamicKHQRString,
            width: 200, 
            height: 200,
            correctLevel: QRCode.CorrectLevel.M
        });

        const md5Hash = md5(dynamicKHQRString);
        statusEl.innerHTML = `<div class="spinner"></div> <span style="color:var(--text-muted);">សូមស្កេនដើម្បីទូទាត់ប្រាក់...</span>`;
        
        let timeLeft = 180; 
        if(timerInterval) clearInterval(timerInterval);
        if(pollingInterval) clearInterval(pollingInterval);
        
        timerText.innerText = "03:00";
        document.getElementById('khqr-timer').style.display = "block";
        
        timerInterval = setInterval(() => {
            timeLeft--;
            let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            let s = (timeLeft % 60).toString().padStart(2, '0');
            timerText.innerText = `${m}:${s}`;
            
            if(timeLeft <= 0) {
                clearInterval(timerInterval);
                clearInterval(pollingInterval);
                statusEl.innerHTML = `❌ <span style="color:#ff4444;">ផុតកំណត់ម៉ោងទូទាត់! សូមធ្វើការបញ្ជាទិញម្តងទៀត។</span>`;
                qrContainer.style.opacity = "0.2"; 
            }
        }, 1000);

        pollingInterval = setInterval(async () => {
            const apiResult = await checkTransactionStatus(md5Hash);
            
            if (apiResult && apiResult.responseCode === 0) { 
                clearInterval(pollingInterval); 
                clearInterval(timerInterval);
                statusEl.innerHTML = `✅ <span style="color:#4caf50; font-weight:bold;">ការទូទាត់ទទួលបានជោគជ័យ!</span>`;
                
                if(typeof window.saveOrderToFirebase === 'function') {
                    window.saveOrderToFirebase(orderData); 
                }
            }
        }, 5000); 

    } catch (error) {
        console.error("Error Builder:", error);
        statusEl.innerHTML = `❌ <span style="color:#ff4444;">${error.message}</span>`;
    }
};

window.cancelKHQR = () => {
    if(pollingInterval) clearInterval(pollingInterval);
    if(timerInterval) clearInterval(timerInterval);
    const modalEl = document.getElementById('khqr-modal');
    if(modalEl) modalEl.classList.remove('active');
}