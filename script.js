// =========================================================
// 1. CẤU HÌNH GOOGLE CLIENT ID (Lấy từ Google Cloud Console)
// =========================================================
// Bạn tạo OAuth 2.0 Client ID trên https://console.cloud.google.com/
// Thêm domain GitHub Pages của bạn vào mục "Authorized JavaScript origins"
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const fileInput = document.getElementById('file-input');
const originalContainer = document.getElementById('original-container');
const resultContainer = document.getElementById('result-container');
const promptInput = document.getElementById('prompt-input');
const apiKeyInput = document.getElementById('api-key-input');
const authStatus = document.getElementById('auth-status');
const loadingOverlay = document.getElementById('loading');
const btnProcess = document.getElementById('btn-process');
const btnReset = document.getElementById('btn-reset');
const btnOutfit = document.getElementById('btn-outfit');
const presets = document.querySelectorAll('input[name="preset"]');

let selectedFile = null;
let userProfile = null;

// Tự động tải Gemini API Key cũ (nếu có)
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) apiKeyInput.value = savedKey;

    initGoogleAuth();
});

// 2. KHỞI TẠO NÚT ĐĂNG NHẬP GOOGLE
function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 500); // Chờ SDK nạp xong
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin
    });

    google.accounts.id.renderButton(
        document.getElementById("google-login-btn"),
        { theme: "outline", size: "medium", text: "signin_with" }
    );
}

// 3. XỬ LÝ KHI ĐĂNG NHẬP THÀNH CÔNG
function handleGoogleLogin(response) {
    // Giải mã JWT Token để lấy thông tin Email & Tên
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));

    userProfile = JSON.parse(jsonPayload);

    // Cập nhật giao diện: ĐÃ KẾT NỐI
    authStatus.className = "status-box connected";
    authStatus.innerHTML = `🟢 Đã kết nối: ${userProfile.email}`;

    // MỞ KHÓA NÚT PHỤC CHẾ ÁNH
    btnProcess.disabled = false;
    btnProcess.textContent = "Phục Chế Ảnh";
}

// Hàm chuyển File sang Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

// Upload và Xem trước Ảnh
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            originalContainer.innerHTML = `<img src="${event.target.result}" alt="Ảnh gốc">`;
        };
        reader.readAsDataURL(file);
    }
});

// Chọn Preset
presets.forEach(radio => {
    radio.addEventListener('change', (e) => promptInput.value = e.target.value);
});

btnOutfit.addEventListener('click', () => {
    promptInput.value = "Giữ nguyên khuôn mặt, thay đổi trang phục sang áo sơ mi trắng phẳng phiu, lịch sự.";
    document.getElementById('opt-clothes').checked = true;
});

// 4. XỬ LÝ GỬI YÊU CẦU PHỤC CHẾ ÁNH
btnProcess.addEventListener('click', async () => {
    if (!userProfile) {
        alert("Vui lòng đăng nhập tài khoản Google trước!");
        return;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Vui lòng nhập Gemini API Key!");
        apiKeyInput.focus();
        return;
    }

    if (!selectedFile) {
        alert("Vui lòng tải ảnh gốc cần phục hồi lên trước!");
        return;
    }

    localStorage.setItem('gemini_api_key', apiKey);
    const promptText = promptInput.value || "Hãy phân tích chi tiết vết hỏng và hư hại trên ảnh này, đưa ra giải pháp phục hồi chi tiết.";
    
    loadingOverlay.style.display = 'flex';

    try {
        const base64Data = await fileToBase64(selectedFile);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: promptText },
                            {
                                inline_data: {
                                    mime_type: selectedFile.type,
                                    data: base64Data
                                }
                            }
                        ]
                    }]
                })
            }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const resultText = data.candidates[0].content.parts[0].text;
        resultContainer.innerHTML = `<div style="padding: 15px; color: #fff; text-align: left; overflow-y: auto; max-height: 100%; line-height: 1.6;">${resultText.replace(/\n/g, '<br>')}</div>`;

    } catch (error) {
        console.error("Lỗi:", error);
        alert("Lỗi kết nối Gemini API: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

// Reset
btnReset.addEventListener('click', () => {
    fileInput.value = '';
    selectedFile = null;
    originalContainer.innerHTML = `
        <label for="file-input" class="upload-label">
            ➕ Nhấp vào đây để tải ảnh cũ lên
        </label>
        <input type="file" id="file-input" accept="image/*">
    `;
    resultContainer.innerHTML = '<span class="placeholder-text">Ảnh đã phục chế của bạn sẽ xuất hiện ở đây.</span>';
    promptInput.value = '';
    presets.forEach(radio => radio.checked = false);
});