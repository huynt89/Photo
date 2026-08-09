const GOOGLE_CLIENT_ID = "957298442128-v4c9rc83fud515f2is92p97lojjoiuja.apps.googleusercontent.com";

const fileInput = document.getElementById('file-input');
const originalContainer = document.getElementById('original-container');
const resultContainer = document.getElementById('result-container');
const promptInput = document.getElementById('prompt-input');
const authStatus = document.getElementById('auth-status');
const loadingOverlay = document.getElementById('loading');
const btnProcess = document.getElementById('btn-process');
const btnReset = document.getElementById('btn-reset');
const btnOutfit = document.getElementById('btn-outfit');
const presets = document.querySelectorAll('input[name="preset"]');

let selectedFile = null;
let isConnected = false;

window.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
});

function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 500);
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

function handleGoogleLogin(response) {
    isConnected = true;

    // Cập nhật trạng thái chỉ hiển thị: 🟢 Đã kết nối
    authStatus.className = "status-box connected";
    authStatus.innerHTML = `🟢 Đã kết nối`;

    btnProcess.disabled = false;
    btnProcess.textContent = "Phục Chế Ảnh";
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

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

presets.forEach(radio => {
    radio.addEventListener('change', (e) => promptInput.value = e.target.value);
});

btnOutfit.addEventListener('click', () => {
    promptInput.value = "Giữ nguyên khuôn mặt, thay đổi trang phục sang áo sơ mi trắng phẳng phiu, lịch sự.";
    document.getElementById('opt-clothes').checked = true;
});

btnProcess.addEventListener('click', async () => {
    if (!isConnected) {
        alert("Vui lòng đăng nhập tài khoản Google trước!");
        return;
    }

    if (!selectedFile) {
        alert("Vui lòng tải ảnh gốc cần phục hồi lên trước!");
        return;
    }

    const promptText = promptInput.value || "Hãy phân tích chi tiết vết hỏng và hư hại trên ảnh này, đưa ra giải pháp phục hồi chi tiết.";
    loadingOverlay.style.display = 'flex';

    try {
        const base64Data = await fileToBase64(selectedFile);

        // Gửi dữ liệu tới API trung gian Vercel
        const response = await fetch('https://photo-one-pi.vercel.app/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                promptText: promptText,
                base64Data: base64Data,
                mimeType: selectedFile.type
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);

        const resultText = data.candidates[0].content.parts[0].text;
        resultContainer.innerHTML = `<div style="padding: 15px; color: #fff; text-align: left; overflow-y: auto; max-height: 100%; line-height: 1.6;">${resultText.replace(/\n/g, '<br>')}</div>`;

    } catch (error) {
        console.error("Lỗi:", error);
        alert("Lỗi xử lý ảnh: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

btnReset.addEventListener('click', () => {
    fileInput.value = '';
    selectedFile = null;
    originalContainer.innerHTML = `
        <label for="file-input" class="upload-label">
            ➕ Nhấp vào đây để tải ảnh cũ lên
        </label>
        <input type="file" id="file-input" accept="image/*">
    `;
    resultContainer.innerHTML = '<span class="placeholder-text">Vui lòng đăng nhập Google và tải ảnh lên để bắt đầu.</span>';
    promptInput.value = '';
    presets.forEach(radio => radio.checked = false);
});