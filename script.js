const GOOGLE_CLIENT_ID = "894418983821-fjoc610mc93qirdoq67i1ufktq9jboc4.apps.googleusercontent.com";
const VERCEL_API_URL = 'https://photo-one-pi.vercel.app/api/process';

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
let tokenClient;

window.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth();
});

function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 500);
        return;
    }

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

const customBtn = document.getElementById('custom-google-btn');
if (customBtn) {
    customBtn.addEventListener('click', () => {
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
    btnProcess.disabled = false;
    btnProcess.textContent = "Phục Chế Ảnh";
    
    const btn = document.getElementById('custom-google-btn');
    if (btn) btn.style.display = 'none'; // Ẩn nút sau khi đăng nhập thành công
}

function fileToBase64(file, maxWidth = 1024) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let scale = Math.min(maxWidth / image.width, 1);
            canvas.width = image.width * scale;
            canvas.height = image.height * scale;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            
            const base64 = canvas.toDataURL(file.type, 0.85).split(',')[1];
            resolve(base64);
        };
        image.onerror = error => reject(error);
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

    
	let promptText = promptInput.value ||
    "Phục chế ảnh cũ một cách tự nhiên và chân thực.";

const gender =
    document.getElementById('gender-select')?.value;

const optHair =
    document.getElementById('opt-hair')?.checked;

const optAsian =
    document.getElementById('opt-asian')?.checked;

const optClothes =
    document.getElementById('opt-clothes')?.checked;


// ======================================
// Bổ sung yêu cầu phục chế
// ======================================

promptText += `

YÊU CẦU PHỤC CHẾ:

- Giữ nguyên khuôn mặt và nhận dạng của người trong ảnh.
- Không thay đổi bố cục và tư thế nếu không được yêu cầu.
- Khôi phục các chi tiết bị mất.
- Làm sạch vết xước, vết bẩn và nhiễu.
- Tăng độ rõ nét nhưng phải giữ vẻ tự nhiên.
- Không làm khuôn mặt trở thành một người khác.
`;


// ======================================
// Giới tính
// ======================================

if (gender === 'male') {
    promptText += `
- Chủ thể là nam.
- Giữ các đặc điểm nam tính tự nhiên.
`;
}

if (gender === 'female') {
    promptText += `
- Chủ thể là nữ.
- Giữ các đặc điểm nữ tính tự nhiên.
`;
}


// ======================================
// Tóc
// ======================================

if (optHair) {
    promptText += `
- Phục hồi và vẽ lại tóc bị mất hoặc hư hỏng.
- Tóc phải tự nhiên, phù hợp với khuôn mặt và ảnh gốc.
`;
}


// ======================================
// Người châu Á
// ======================================

if (optAsian) {
    promptText += `
- Chủ thể là người châu Á.
- Ưu tiên kiểu tóc đen tự nhiên.
- Giữ đặc điểm khuôn mặt châu Á của người trong ảnh.
`;
}


// ======================================
// Trang phục
// ======================================

if (optClothes) {
    promptText += `
- Phục hồi hoặc tái tạo trang phục bị hỏng.
- Giữ kiểu dáng phù hợp với ảnh gốc.
- Không làm thay đổi cơ thể hoặc khuôn mặt.
`;
}
	
    loadingOverlay.style.display = 'flex';

    try {
        const base64Data = await fileToBase64(selectedFile);

        const response = await fetch(VERCEL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                promptText: promptText,
                base64Data: base64Data,
                mimeType: selectedFile.type
            })
        });

        const data = await response.json();

if (!response.ok || data.error) {
    throw new Error(
        data.error || 'Lỗi kết nối Server API'
    );
}

// ======================================
// Nhận ảnh Gemini trả về
// ======================================
if (data.image && data.image.data) {

    const mimeType =
        data.image.mimeType || 'image/png';

    const imageSrc =
        `data:${mimeType};base64,${data.image.data}`;

    resultContainer.innerHTML = `
        <img
            src="${imageSrc}"
            alt="Ảnh đã phục chế"
            style="
                max-width: 100%;
                max-height: 70vh;
                object-fit: contain;
                border-radius: 4px;
            "
        >
    `;

} else {

    throw new Error(
        data.text ||
        'Gemini không trả về ảnh phục chế.'
    );
}
		
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