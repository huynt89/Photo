const fileInput = document.getElementById('file-input');
const originalContainer = document.getElementById('original-container');
const resultContainer = document.getElementById('result-container');
const promptInput = document.getElementById('prompt-input');
const loadingOverlay = document.getElementById('loading');
const btnProcess = document.getElementById('btn-process');
const btnReset = document.getElementById('btn-reset');
const btnOutfit = document.getElementById('btn-outfit');
const presets = document.querySelectorAll('input[name="preset"]');

let selectedFile = null;

// =========================================================
// 1. CHÈN GEMINI API KEY CỦA BẠN VÀO DÒNG DƯỚI ĐÂY
// =========================================================
const GEMINI_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

// Hàm hỗ trợ chuyển file ảnh sang chuỗi Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

// Xử lý Upload Ảnh và hiển thị xem trước
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

// Tự động điền Prompt khi chọn mẫu có sẵn
presets.forEach(radio => {
    radio.addEventListener('change', (e) => {
        promptInput.value = e.target.value;
    });
});

// Nút ghép trang phục nhanh
btnOutfit.addEventListener('click', () => {
    promptInput.value = "Giữ nguyên khuôn mặt, thay đổi trang phục sang áo sơ mi trắng phẳng phiu, lịch sự.";
    document.getElementById('opt-clothes').checked = true;
});

// =========================================================
// 2. GỬI ẢNH + PROMPT LÊN GEMINI API ĐỂ XỬ LÝ
// =========================================================
btnProcess.addEventListener('click', async () => {
    if (!selectedFile) {
        alert("Vui lòng tải ảnh gốc cần phục hồi lên trước!");
        return;
    }

    if (GEMINI_API_KEY.includes("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")) {
        alert("Bạn chưa dán Gemini API Key vào file script.js!");
        return;
    }

    const promptText = promptInput.value || "Hãy phân tích chi tiết vết hỏng và hư hại trên ảnh này, đưa ra giải pháp phục hồi chi tiết.";
    loadingOverlay.style.display = 'flex';

    try {
        // Chuyển ảnh sang định dạng Base64
        const base64Data = await fileToBase64(selectedFile);

        // Gọi REST API trực tiếp của Google Gemini (Mô hình Gemini Flash)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

        if (data.error) {
            throw new Error(data.error.message);
        }

        // Lấy kết quả phản hồi từ Gemini
        const resultText = data.candidates[0].content.parts[0].text;

        // Hiển thị nội dung phản hồi của Gemini lên khung bên phải
        resultContainer.innerHTML = `<div style="padding: 15px; color: #fff; text-align: left; overflow-y: auto; max-height: 100%; line-height: 1.6;">${resultText.replace(/\n/g, '<br>')}</div>`;

    } catch (error) {
        console.error("Chi tiết lỗi:", error);
        alert("Lỗi Gemini API: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

// Nút Làm lại
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