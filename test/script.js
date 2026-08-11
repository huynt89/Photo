// Import Client trực tiếp từ CDN Hugging Face Gradio
import { Client, handle_file } from "https://cdn.jsdelivr.net/npm/@gradio/client@1.9.0/+esm";

// Biến lưu trữ trạng thái ứng dụng
let selectedFile = null;
let isLoggedIn = false;
let userProfile = null;

// Khai báo các phần tử DOM
const customGoogleBtn = document.getElementById('custom-google-btn');
const authStatus = document.getElementById('auth-status');
const fileInput = document.getElementById('file-input');
const originalPreview = document.getElementById('original-preview');
const uploadLabel = document.getElementById('upload-label');
const resultImage = document.getElementById('result-image');
const placeholderText = document.getElementById('placeholder-text');
const loadingOverlay = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const btnProcess = document.getElementById('btn-process');
const btnOutfit = document.getElementById('btn-outfit');
const btnReset = document.getElementById('btn-reset');
const btnDownload = document.getElementById('btn-download');

// ==========================================
// 1. TỔNG HỢP VÀ TẠO BIẾN PROMPT DỘNG
// ==========================================
function buildFullPrompt() {
    let promptParts = [];

    // Lấy yêu cầu nhập tay từ Textarea
    const customPrompt = document.getElementById('prompt-input').value.trim();
    if (customPrompt) {
        promptParts.push(customPrompt);
    }

    // Lấy yêu cầu từ Mẫu có sẵn (Radio)
    const selectedPreset = document.querySelector('input[name="preset"]:checked');
    if (selectedPreset) {
        promptParts.push(selectedPreset.value);
    }

    // Lấy Giới tính
    const gender = document.getElementById('gender-select').value;
    if (gender === 'male') {
        promptParts.push("Chủ thể là Nam (Male subject)");
    } else if (gender === 'female') {
        promptParts.push("Chủ thể là Nữ (Female subject)");
    }

    // Lấy các Checkbox tùy chọn
    if (document.getElementById('opt-hair').checked) {
        promptParts.push("Vẽ lại chi tiết tóc (Detailed hair reconstruction)");
    }
    if (document.getElementById('opt-asian').checked) {
        promptParts.push("Nét mặt người Châu Á, tóc đen (Asian facial features, black hair)");
    }
    if (document.getElementById('opt-clothes').checked) {
        promptParts.push("Tái tạo trang phục lịch sự, sắc nét (Clean and sharp clothing)");
    }

    // Nối tất cả thành 1 chuỗi Prompt hoàn chỉnh
    const finalPrompt = promptParts.join(". ");
    console.log("📝 Full Prompt được tạo:", finalPrompt);
    return finalPrompt;
}

// ==========================================
// 2. GIẢ LẬP / ĐĂNG NHẬP GOOGLE AUTH
// ==========================================
customGoogleBtn.addEventListener('click', () => {
    // Trong môi trường thực tế, gọi Google Identity Services API
    // Ở đây ta mô phỏng Đăng nhập thành công để kiểm thử
    isLoggedIn = true;
    userProfile = { name: "Người dùng Google" };

    authStatus.className = "status-box connected";
    authStatus.innerHTML = `🟢 Đã kết nối: ${userProfile.name}`;
    customGoogleBtn.style.display = "none";

    checkReadyToProcess();
});

// ==========================================
// 3. XỬ LÝ UPLOAD VÀ XEM TRƯỚC ẢNH
// ==========================================
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            originalPreview.src = event.target.result;
            originalPreview.style.display = 'block';
            uploadLabel.style.display = 'none';
        };
        reader.readAsDataURL(file);
        checkReadyToProcess();
    }
});

function checkReadyToProcess() {
    if (isLoggedIn && selectedFile) {
        btnProcess.disabled = false;
        btnProcess.innerText = "Phục Chế Ảnh Ngay";
    }
}

// ==========================================
// 4. GỌI HUGGING FACE API VÀ PHỤC CHẾ ẢNH
// ==========================================
async function processImage(isOutfitMode = false) {
    if (!selectedFile) {
        alert("Vui lòng chọn ảnh cần phục chế!");
        return;
    }

    const fullPrompt = buildFullPrompt();
    loadingOverlay.style.display = 'flex';
    loadingText.innerText = "⏳ Đang kết nối AI Hugging Face...";

    try {
        // Kết nối trực tiếp vào siêu máy chủ CodeFormer trên Hugging Face Spaces
        const app = await Client.connect("sczhou/CodeFormer");

        loadingText.innerText = "⏳ AI đang tiến hành làm nét và phục hồi ảnh...";

        // Truyền tệp ảnh và tham số xử lý
        const result = await app.predict(0, [
            handle_file(selectedFile), // File ảnh từ trình duyệt
            true,                      // Background enhance (Làm nét nền)
            true,                      // Face upsample (Làm nét mặt)
            2,                         // Upscale 2x
            0.5                        // Fidelity (Cân bằng chân thực)
        ]);

        // Lấy URL ảnh kết quả từ Hugging Face
        const resultUrl = result.data[0].url || result.data[0];

        // Hiển thị kết quả ra giao diện
        resultImage.src = resultUrl;
        resultImage.style.display = 'block';
        placeholderText.style.display = 'none';
        
        btnDownload.href = resultUrl;
        btnDownload.style.display = 'block';

        console.log("✅ Phục chế thành công! Ảnh trả về:", resultUrl);

    } catch (error) {
        console.error("Lỗi phục chế ảnh:", error);
        alert("❌ Đã xảy ra lỗi khi gọi AI: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Gắn sự kiện cho các nút bấm
btnProcess.addEventListener('click', () => processImage(false));
btnOutfit.addEventListener('click', () => processImage(true));

// Reset trang web
btnReset.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    originalPreview.style.display = 'none';
    uploadLabel.style.display = 'block';
    resultImage.style.display = 'none';
    placeholderText.style.display = 'block';
    btnDownload.style.display = 'none';
    document.getElementById('prompt-input').value = '';
    if (!isLoggedIn) {
        btnProcess.disabled = true;
        btnProcess.innerText = "Phục Chế Ảnh (Cần Kết Nối)";
    }
});