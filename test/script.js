import { Client, handle_file } from "https://cdn.jsdelivr.net/npm/@gradio/client@1.9.0/+esm";

// ⚠️ THAY BẰNG CLIENT ID THẬT CỦA BẠN NẾU CẦN
const GOOGLE_CLIENT_ID = "894418983821-fjoc610mc93qirdoq67i1ufktq9jboc4.apps.googleusercontent.com";

document.addEventListener('DOMContentLoaded', () => {
    let selectedFile = null;
    let isLoggedIn = false;

    // Các thành phần UI cơ bản
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

    // Các thành phần UI bên bảng Prompt (Bạn cần đảm bảo HTML có các ID/Name này)
    const promptInput = document.getElementById('prompt-input'); // Khung nhập text
    const radioTemplates = document.getElementsByName('template'); // Các nút chọn mẫu
    const genderSelect = document.getElementById('gender-select'); // Dropdown giới tính
    const cbHair = document.getElementById('cb-hair'); // Checkbox Tóc
    const cbAsian = document.getElementById('cb-asian'); // Checkbox Châu Á
    const cbClothes = document.getElementById('cb-clothes'); // Checkbox Trang phục

    // ==========================================
    // 1. TÍCH HỢP GOOGLE SIGN-IN
    // ==========================================
    function handleCredentialResponse(response) {
        // Mô phỏng đăng nhập thành công cho gọn
        isLoggedIn = true;
        authStatus.className = "status-box connected";
        authStatus.innerHTML = `🟢 Đã kết nối tài khoản Google`;
        customGoogleBtn.style.display = "none";
        if (selectedFile) enableButtons();
    }

    if (window.google && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com") {
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse });
    }

    if (customGoogleBtn) {
        customGoogleBtn.addEventListener('click', () => {
            if (window.google) google.accounts.id.prompt();
            else handleCredentialResponse(); // Chạy tạm nếu chưa có Google Client
        });
    }

    // ==========================================
    // 2. TẢI VÀ XEM TRƯỚC ẢNH
    // ==========================================
    function enableButtons() {
        if (btnProcess) { btnProcess.disabled = false; btnProcess.innerText = "Phục Chế Ảnh Ngay"; }
        if (btnOutfit) { btnOutfit.disabled = false; }
    }

    if (fileInput) {
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
                if (isLoggedIn) enableButtons();
            }
        });
    }

    // ==========================================
    // 3. HÀM GOM PROMPT TỪ BẢNG BÊN TRÁI
    // ==========================================
    function buildFinalPrompt() {
        let finalPrompt = "";

        // Lấy Prompt tự nhập
        if (promptInput && promptInput.value.trim() !== "") {
            finalPrompt += promptInput.value.trim() + ", ";
        }

        // Lấy mẫu có sẵn (Radio buttons)
        if (radioTemplates) {
            for (const radio of radioTemplates) {
                if (radio.checked) { finalPrompt += radio.value + ", "; break; }
            }
        }

        // Lấy giới tính
        if (genderSelect && genderSelect.value !== "Tự động") {
            finalPrompt += "gender " + genderSelect.value + ", ";
        }

        // Lấy các checkbox
        if (cbHair && cbHair.checked) finalPrompt += "detailed hair, ";
        if (cbAsian && cbAsian.checked) finalPrompt += "asian face black hair, ";
        if (cbClothes && cbClothes.checked) finalPrompt += "highly detailed clothes, ";

        // Dịch qua tiếng Anh (Mặc định AI hiểu tiếng Anh tốt nhất)
        return finalPrompt.trim();
    }

    // ==========================================
    // 4. XỬ LÝ: PHỤC CHẾ ẢNH (DÙNG CODEFORMER)
    // ==========================================
    async function handleRestore() {
        if (!selectedFile) return alert("Vui lòng chọn ảnh!");
        
        loadingOverlay.style.display = 'flex';
        loadingText.innerText = "⏳ Đang kết nối AI CodeFormer để phục chế (Có thể mất 20s)...";

        try {
            // Sử dụng Client chuẩn để qua mặt lỗi 404 và xử lý hàng đợi
            const app = await Client.connect("sczhou/CodeFormer");
            const result = await app.predict(0, [
                handle_file(selectedFile),
                true, // background_enhance
                true, // face_upsample
                2,    // upscale
                0.5   // fidelity
            ]);

            const resultUrl = result.data[0].url || result.data[0];
            showResult(resultUrl);
        } catch (err) {
            console.error(err);
            alert("❌ Lỗi phục chế: " + err.message);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // ==========================================
    // 5. XỬ LÝ: GHÉP TRANG PHỤC (DÙNG AI HIỂU PROMPT)
    // ==========================================
    async function handleOutfitChange() {
        if (!selectedFile) return alert("Vui lòng chọn ảnh!");
        
        const promptText = buildFinalPrompt();
        if (!promptText) return alert("Vui lòng nhập Prompt hoặc chọn mẫu ở bảng điều khiển!");

        loadingOverlay.style.display = 'flex';
        loadingText.innerText = `⏳ Đang gửi Prompt: "${promptText.substring(0, 30)}..." tới AI...`;

        try {
            // Gọi AI hỗ trợ sửa ảnh bằng Prompt (VD: Instruct-Pix2Pix)
            const app = await Client.connect("timbrooks/instruct-pix2pix");
            const result = await app.predict(0, [
                promptText,                 // Truyền câu lệnh (Prompt) vào đây
                handle_file(selectedFile),  // Ảnh gốc
                7.5,                        // Text CFG
                1.5,                        // Image CFG
                20                          // Số bước xử lý
            ]);

            const resultUrl = result.data[0].url || result.data[0];
            showResult(resultUrl);
        } catch (err) {
            console.error(err);
            alert("❌ Lỗi ghép trang phục: " + err.message + "\n(Gợi ý: Máy chủ AI này có thể đang bận, thử lại sau)");
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // Hàm hiển thị kết quả chung
    function showResult(url) {
        resultImage.src = url;
        resultImage.style.display = 'block';
        placeholderText.style.display = 'none';
        if (btnDownload) {
            btnDownload.href = url;
            btnDownload.style.display = 'block';
        }
    }

    // Gắn sự kiện cho 2 nút bấm khác nhau
    if (btnProcess) btnProcess.addEventListener('click', handleRestore);
    if (btnOutfit) btnOutfit.addEventListener('click', handleOutfitChange);

    // ==========================================
    // 6. RESET
    // ==========================================
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            selectedFile = null;
            fileInput.value = '';
            originalPreview.style.display = 'none';
            uploadLabel.style.display = 'block';
            resultImage.style.display = 'none';
            placeholderText.style.display = 'block';
            if (btnDownload) btnDownload.style.display = 'none';
        });
    }
});