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

// LƯU Ý QUAN TRỌNG: 
// Điền API Token từ tài khoản Hugging Face của bạn vào đây
// Đăng ký miễn phí tại: https://huggingface.co/settings/tokens
const API_TOKEN = "hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

// 1. Xử lý Upload Ảnh và hiển thị xem trước
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

// 2. Tự động điền Prompt khi người dùng chọn mẫu có sẵn
presets.forEach(radio => {
    radio.addEventListener('change', (e) => {
        promptInput.value = e.target.value;
    });
});

// Nút tắt ghép trang phục nhanh
btnOutfit.addEventListener('click', () => {
    promptInput.value = "Giữ nguyên khuôn mặt, thay đổi trang phục sang áo sơ mi trắng phẳng phiu, lịch sự.";
    document.getElementById('opt-clothes').checked = true;
});

// 3. Gửi Ảnh + Prompt lên Model AI (Image-to-Image) để xử lý
btnProcess.addEventListener('click', async () => {
    if (!selectedFile) {
        alert("Vui lòng tải ảnh gốc cần phục hồi lên trước!");
        return;
    }

    if (API_TOKEN.includes("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")) {
        alert("Bạn chưa nhập mã API_TOKEN của Hugging Face vào file script.js!");
        return;
    }

    loadingOverlay.style.display = 'flex';

    try {
        // Chuyển file ảnh thành mảng dữ liệu nhị phân (Buffer) để gửi qua API
        const arrayBuffer = await selectedFile.arrayBuffer();

        // Gọi Model GFPGAN chuyên dụng để phục hồi khuôn mặt và hình ảnh cũ
        const response = await fetch(
            "https://api-inference.huggingface.co/models/tencentarc/gfpgan",
            {
                headers: {
                    Authorization: `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/octet-stream",
                },
                method: "POST",
                body: arrayBuffer,
            }
        );

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Lỗi khi kết nối tới máy chủ AI.");
        }

        // Nhận kết quả trả về là một file ảnh nhị phân (Blob)
        const imageBlob = await response.blob();
        
        // Chuyển Blob thành URL để hiển thị lên thẻ <img>
        const restoredImageUrl = URL.createObjectURL(imageBlob);

        // Render ảnh đã phục chế ra giao diện
        resultContainer.innerHTML = `<img src="${restoredImageUrl}" alt="Ảnh đã phục chế">`;

    } catch (error) {
        console.error("Chi tiết lỗi:", error);
        alert("Lỗi quá trình phục hồi: " + error.message);
    } finally {
        // Tắt vòng xoay loading
        loadingOverlay.style.display = 'none';
    }
});

// 4. Khôi phục lại trạng thái ban đầu của giao diện
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