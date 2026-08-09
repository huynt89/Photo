const GOOGLE_CLIENT_ID = "894418983821-fjoc610mc93qirdoq67i1ufktq9jboc4.apps.googleusercontent.com"; //
// THAY ĐỔI 1: Trỏ API URL về địa chỉ Cloudflare Worker của bạn
const WORKER_URL = 'https://gemini-image-proxy.tuanhuycntt.workers.dev';

const fileInput = document.getElementById('file-input'); //
const originalContainer = document.getElementById('original-container'); //
const resultContainer = document.getElementById('result-container'); //[cite: 1]
const promptInput = document.getElementById('prompt-input'); //[cite: 1]
const authStatus = document.getElementById('auth-status'); //[cite: 1]
const loadingOverlay = document.getElementById('loading'); //[cite: 1]
const btnProcess = document.getElementById('btn-process'); //[cite: 1]
const btnReset = document.getElementById('btn-reset'); //[cite: 1]
const btnOutfit = document.getElementById('btn-outfit'); //[cite: 1]
const presets = document.querySelectorAll('input[name="preset"]'); //[cite: 1]

let selectedFile = null; //[cite: 1]
let isConnected = false; //[cite: 1]
let tokenClient; //[cite: 1]

window.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth(); //[cite: 1]
});

function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 500); //[cite: 1]
        return; //[cite: 1]
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID, //[cite: 1]
        scope: 'email profile', //[cite: 1]
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                handleGoogleLogin(); //[cite: 1]
            }
        }
    }); //[cite: 1]
}

const customBtn = document.getElementById('custom-google-btn'); //[cite: 1]
if (customBtn) {
    customBtn.addEventListener('click', () => {
        if (tokenClient) {
            tokenClient.requestAccessToken(); //[cite: 1]
        } else {
            alert("Đang tải hệ thống Google, vui lòng thử lại sau 1 giây!"); //[cite: 1]
        }
    }); //[cite: 1]
}

function handleGoogleLogin() {
    isConnected = true; //[cite: 1]
    authStatus.className = "status-box connected"; //[cite: 1]
    authStatus.innerHTML = `🟢 Đã kết nối`; //[cite: 1]
    btnProcess.disabled = false; //[cite: 1]
    btnProcess.textContent = "Phục Chế Ảnh"; //[cite: 1]
    
    const btn = document.getElementById('custom-google-btn'); //[cite: 1]
    if (btn) btn.style.display = 'none'; //[cite: 1]
}

function fileToBase64(file, maxWidth = 1024) {
    return new Promise((resolve, reject) => {
        const image = new Image(); //[cite: 1]
        image.src = URL.createObjectURL(file); //[cite: 1]
        image.onload = () => {
            const canvas = document.createElement('canvas'); //[cite: 1]
            let scale = Math.min(maxWidth / image.width, 1); //[cite: 1]
            canvas.width = image.width * scale; //[cite: 1]
            canvas.height = image.height * scale; //[cite: 1]
            
            const ctx = canvas.getContext('2d'); //[cite: 1]
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height); //[cite: 1]
            
            const base64 = canvas.toDataURL(file.type, 0.85).split(',')[1]; //[cite: 1]
            resolve(base64); //[cite: 1]
        };
        image.onerror = error => reject(error); //[cite: 1]
    }); //[cite: 1]
}

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]; //[cite: 1]
    if (file) {
        selectedFile = file; //[cite: 1]
        const reader = new FileReader(); //[cite: 1]
        reader.onload = (event) => {
            originalContainer.innerHTML = `<img src="${event.target.result}" alt="Ảnh gốc">`; //[cite: 1]
        };
        reader.readAsDataURL(file); //[cite: 1]
    }
}); //[cite: 1]

presets.forEach(radio => {
    radio.addEventListener('change', (e) => promptInput.value = e.target.value); //[cite: 1]
}); //[cite: 1]

btnOutfit.addEventListener('click', () => {
    promptInput.value = "Giữ nguyên khuôn mặt, thay đổi trang phục sang áo sơ mi trắng phẳng phiu, lịch sự."; //[cite: 1]
    document.getElementById('opt-clothes').checked = true; //[cite: 1]
}); //[cite: 1]

btnProcess.addEventListener('click', async () => {
    if (!isConnected) {
        alert("Vui lòng đăng nhập tài khoản Google trước!"); //[cite: 1]
        return; //[cite: 1]
    }

    if (!selectedFile) {
        alert("Vui lòng tải ảnh gốc cần phục hồi lên trước!"); //[cite: 1]
        return; //[cite: 1]
    }

    let promptText = promptInput.value || "Phục chế ảnh cũ một cách tự nhiên và chân thực."; //[cite: 1]

    const gender = document.getElementById('gender-select')?.value; //[cite: 1]
    const optHair = document.getElementById('opt-hair')?.checked; //[cite: 1]
    const optAsian = document.getElementById('opt-asian')?.checked; //[cite: 1]
    const optClothes = document.getElementById('opt-clothes')?.checked; //[cite: 1]

    promptText += `\n\nYÊU CẦU PHỤC CHẾ:\n- Giữ nguyên khuôn mặt và nhận dạng của người trong ảnh.\n- Không thay đổi bố cục và tư thế nếu không được yêu cầu.\n- Khôi phục các chi tiết bị mất.\n- Làm sạch vết xước, vết bẩn và nhiễu.\n- Tăng độ rõ nét nhưng phải giữ vẻ tự nhiên.\n- Không làm khuôn mặt trở thành một người khác.\n`; //[cite: 1]

    if (gender === 'male') promptText += `- Chủ thể là nam.\n- Giữ các đặc điểm nam tính tự nhiên.\n`; //[cite: 1]
    if (gender === 'female') promptText += `- Chủ thể là nữ.\n- Giữ các đặc điểm nữ tính tự nhiên.\n`; //[cite: 1]
    if (optHair) promptText += `- Phục hồi và vẽ lại tóc bị mất hoặc hư hỏng.\n- Tóc phải tự nhiên, phù hợp với khuôn mặt và ảnh gốc.\n`; //[cite: 1]
    if (optAsian) promptText += `- Chủ thể là người châu Á.\n- Ưu tiên kiểu tóc đen tự nhiên.\n- Giữ đặc điểm khuôn mặt châu Á của người trong ảnh.\n`; //[cite: 1]
    if (optClothes) promptText += `- Phục hồi hoặc tái tạo trang phục bị hỏng.\n- Giữ kiểu dáng phù hợp với ảnh gốc.\n- Không làm thay đổi cơ thể hoặc khuôn mặt.\n`; //[cite: 1]

    loadingOverlay.style.display = 'flex'; //[cite: 1]

    try {
        const base64Data = await fileToBase64(selectedFile); //[cite: 1]

        // THAY ĐỔI 2: Đổi key JSON để khớp với chuẩn Cloudflare Worker
        const response = await fetch(WORKER_URL, {
            method: 'POST', //[cite: 1]
            headers: { 'Content-Type': 'application/json' }, //[cite: 1]
            body: JSON.stringify({
                prompt: promptText, 
                imageBase64: base64Data, 
                mimeType: selectedFile.type //[cite: 1]
            })
        }); //[cite: 1]

        const data = await response.json(); //[cite: 1]

        if (!response.ok || data.error) {
            throw new Error(data.error || 'Lỗi kết nối Server API'); //[cite: 1]
        }

        // THAY ĐỔI 3: Thêm logic kiểm tra kiểu trả về (Gemini trả Text, AI khác trả Ảnh)
        if (data.image && data.image.data) {
            const mimeType = data.image.mimeType || 'image/png'; //[cite: 1]
            const imageSrc = `data:${mimeType};base64,${data.image.data}`; //[cite: 1]

            resultContainer.innerHTML = `
                <img src="${imageSrc}" alt="Ảnh đã phục chế" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 4px;"> 
            `; //[cite: 1]
        } else if (data.candidates && data.candidates.length > 0) {
            const resultText = data.candidates[0].content.parts[0].text;
            resultContainer.innerHTML = `
                <div style="padding: 15px; color: #fff; text-align: left; overflow-y: auto; max-height: 100%; line-height: 1.6;">
                    ${resultText.replace(/\n/g, '<br>')}
                </div>
            `;
        } else {
            throw new Error(data.text || 'API không trả về kết quả hợp lệ.'); //[cite: 1]
        }
        
    } catch (error) {
        console.error("Lỗi:", error); //[cite: 1]
        alert("Lỗi xử lý ảnh: " + error.message); //[cite: 1]
    } finally {
        loadingOverlay.style.display = 'none'; //[cite: 1]
    }
}); //[cite: 1]

btnReset.addEventListener('click', () => {
    fileInput.value = ''; //[cite: 1]
    selectedFile = null; //[cite: 1]
    originalContainer.innerHTML = `
        <label for="file-input" class="upload-label">
            ➕ Nhấp vào đây để tải ảnh cũ lên 
        </label>
        <input type="file" id="file-input" accept="image/*"> 
    `; //[cite: 1]
    resultContainer.innerHTML = '<span class="placeholder-text">Vui lòng đăng nhập Google và tải ảnh lên để bắt đầu.</span>'; //[cite: 1]
    promptInput.value = ''; //[cite: 1]
    presets.forEach(radio => radio.checked = false); //[cite: 1]
}); //[cite: 1]