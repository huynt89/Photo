
// ================= CẤU HÌNH =================
const GOOGLE_CLIENT_ID = "894418983821-fjoc610mc93qirdoq67i1ufktq9jboc4.apps.googleusercontent.com"; 
const VERCEL_API_URL = 'https://photo-one-pi.vercel.app/api/process'; // Link API Vercel của bạn

// ================= DOM ELEMENTS =================
const authStatus = document.getElementById('auth-status');
const customGoogleBtn = document.getElementById('custom-google-btn');
const btnProcess = document.getElementById('btn-process');
const imageUpload = document.getElementById('image-upload');
const originalImage = document.getElementById('original-image');
const promptInput = document.getElementById('prompt-input');
const presetRadios = document.querySelectorAll('input[name="preset"]');
const loadingSpinner = document.getElementById('loading-spinner');
const resultContent = document.getElementById('result-content');

let isConnected = false;
let base64Image = "";
let mimeType = "";
let tokenClient;

// ================= GOOGLE AUTH =================
window.onload = function() {
    initGoogleAuth();
};

function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 500);
        return;
    }

    // Dùng initTokenClient thay thế cho iframe cũ
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                handleGoogleLogin();
            }
        }
    });
}

if (customGoogleBtn) {
    customGoogleBtn.addEventListener('click', () => {
        if (tokenClient) {
            tokenClient.requestAccessToken();
        } else {
            alert("Đang tải hệ thống Google, vui lòng thử lại sau 1 giây!");
        }
    });
}

function handleGoogleLogin() {
    isConnected = true;
    authStatus.className = "status-box connected";
    authStatus.innerHTML = `🟢 Đã kết nối`;
    customGoogleBtn.style.display = 'none'; // Ẩn nút sau khi kết nối
    
    if (base64Image) {
        btnProcess.disabled = false;
        btnProcess.textContent = "Bắt đầu phục chế";
    } else {
        btnProcess.textContent = "Vui lòng chọn ảnh";
    }
}

// ================= XỬ LÝ ẢNH & GIAO DIỆN =================
// Chọn Radio Box -> Đưa text vào Textarea
presetRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        promptInput.value = e.target.value;
    });
});

// Upload Ảnh
imageUpload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    mimeType = file.type;
    const reader = new FileReader();

    reader.onload = function(e) {
        originalImage.src = e.target.result;
        originalImage.style.display = "block";
        
        // Cắt bỏ phần header data:image/...;base64, để lấy chuỗi raw base64
        base64Image = e.target.result.split(',')[1]; 

        if (isConnected) {
            btnProcess.disabled = false;
            btnProcess.textContent = "Bắt đầu phục chế";
        }
    };
    reader.readAsDataURL(file);
});

// Gọi API Xử lý
btnProcess.addEventListener('click', async () => {
    const finalPrompt = promptInput.value || document.querySelector('input[name="preset"]:checked').value;

    if (!base64Image) {
        alert("Vui lòng tải ảnh lên trước!");
        return;
    }

    btnProcess.disabled = true;
    loadingSpinner.style.display = "block";
    resultContent.innerHTML = "";

    try {
        const response = await fetch(VERCEL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                promptText: finalPrompt,
                base64Data: base64Image,
                mimeType: mimeType
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Có lỗi xảy ra trong quá trình xử lý.');
        }

        // Tùy theo cấu trúc trả về của Gemini để hiển thị (Gemini text model thường trả về text mô tả)
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "Đã xử lý xong (Không có dữ liệu văn bản trả về).";
        resultContent.innerHTML = `<p style="padding: 15px;">${textResult.replace(/\n/g, '<br>')}</p>`;

    } catch (error) {
        alert("Lỗi xử lý ảnh: " + error.message);
    } finally {
        loadingSpinner.style.display = "none";
        btnProcess.disabled = false;
    }
});