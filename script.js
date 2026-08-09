
// ================= CẤU HÌNH =================
const GOOGLE_CLIENT_ID = "894418983821-fjoc610mc93qirdoq67i1ufktq9jboc4.apps.googleusercontent.com"; 
const VERCEL_API_URL = 'https://photo-one-pi.vercel.app//api/process'; // Link API Vercel của bạn

// ================= CẤU HÌNH =================
const GOOGLE_CLIENT_ID = 'ĐIỀN_CLIENT_ID_CỦA_BẠN_VÀO_ĐÂY.apps.googleusercontent.com'; 
const VERCEL_API_URL = 'https://TEN-APP-CUA-BAN.vercel.app/api/process'; 

// ================= DOM ELEMENTS =================
const authStatus = document.getElementById('auth-status');
const btnProcess = document.getElementById('btn-process');
const imageUpload = document.getElementById('image-upload');
const originalImage = document.getElementById('original-image');
const placeholderText = document.getElementById('placeholder-text');
const promptInput = document.getElementById('prompt-input');
const presetRadios = document.querySelectorAll('input[name="preset"]');
const loadingSpinner = document.getElementById('loading-spinner');
const resultContent = document.getElementById('result-content');

let isConnected = false;
let base64Image = "";
let mimeType = "";

// ================= GOOGLE AUTH =================
window.onload = function() {
    initGoogleAuth();
};

function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 500);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });

    google.accounts.id.renderButton(
        document.getElementById("buttonDiv"),
        { theme: "outline", size: "large", width: "100%" } 
    );
}

function handleCredentialResponse(response) {
    if (response && response.credential) {
        isConnected = true;
        authStatus.className = "status-box connected";
        authStatus.innerHTML = `🟢 Đã kết nối Google`;
        
        if (base64Image) {
            btnProcess.disabled = false;
            btnProcess.textContent = "Bắt đầu phục chế";
        } else {
            btnProcess.textContent = "Vui lòng chọn ảnh";
        }
    }
}

// ================= XỬ LÝ ẢNH & GIAO DIỆN =================
presetRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        promptInput.value = e.target.value;
    });
});

imageUpload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    mimeType = file.type;
    const reader = new FileReader();

    reader.onload = function(e) {
        // Hiển thị ảnh vào Cột 2
        originalImage.src = e.target.result;
        originalImage.style.display = "block";
        placeholderText.style.display = "none";
        
        base64Image = e.target.result.split(',')[1]; 

        if (isConnected) {
            btnProcess.disabled = false;
            btnProcess.textContent = "Bắt đầu phục chế";
        } else {
            btnProcess.textContent = "Vui lòng đăng nhập để bắt đầu";
        }
    };
    reader.readAsDataURL(file);
});

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

        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "Đã xử lý xong (Không có dữ liệu văn bản trả về).";
        resultContent.innerHTML = `<p style="padding: 15px;">${textResult.replace(/\n/g, '<br>')}</p>`;

    } catch (error) {
        alert("Lỗi xử lý ảnh: " + error.message);
    } finally {
        loadingSpinner.style.display = "none";
        btnProcess.disabled = false;
    }
});