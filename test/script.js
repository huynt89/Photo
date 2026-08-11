document.addEventListener('DOMContentLoaded', () => {
    let selectedFile = null;
    let isLoggedIn = false;

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

    // 1. Giả lập Đăng nhập Google
    if (customGoogleBtn) {
        customGoogleBtn.addEventListener('click', () => {
            isLoggedIn = true;
            authStatus.className = "status-box connected";
            authStatus.innerHTML = `🟢 Đã kết nối: Người dùng Google`;
            customGoogleBtn.style.display = "none";

            if (selectedFile) {
                btnProcess.disabled = false;
                btnProcess.innerText = "Phục Chế Ảnh Ngay";
            }
        });
    }

    // 2. Tải và xem trước ảnh
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

                if (isLoggedIn) {
                    btnProcess.disabled = false;
                    btnProcess.innerText = "Phục Chế Ảnh Ngay";
                }
            }
        });
    }

    // Convert file ảnh sang dạng Base64
    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

    // 3. Hàm gọi AI xử lý ảnh (Dùng REST API qua CORS Proxy)
    async function processImage() {
        if (!selectedFile) {
            alert("Vui lòng chọn ảnh!");
            return;
        }

        loadingOverlay.style.display = 'flex';
        loadingText.innerText = "⏳ Đang kết nối AI (Server có thể mất 30s để khởi động)...";

        try {
            const base64Image = await fileToBase64(selectedFile);
            
            // Endpoint chính thức của CodeFormer Space
            const targetUrl = "https://sczhou-codeformer.hf.space/api/predict";
            // Dùng CORS Proxy để vượt rào cản trình duyệt trên GitHub Pages
            const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);

            const response = await fetch(proxyUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    data: [
                        base64Image, // Ảnh gốc
                        true,        // background_enhance
                        true,        // face_upsample
                        2,           // upscale 2x
                        0.5          // fidelity
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Server báo lỗi HTTP: ${response.status}. Có thể máy chủ AI đang bận, vui lòng thử lại sau 30 giây.`);
            }

            const data = await response.json();
            
            if (data && data.data && data.data[0]) {
                const resultUrl = data.data[0];
                resultImage.src = resultUrl;
                resultImage.style.display = 'block';
                placeholderText.style.display = 'none';

                if (btnDownload) {
                    btnDownload.href = resultUrl;
                    btnDownload.style.display = 'block';
                }
            } else {
                throw new Error("Không nhận được dữ liệu ảnh trả về từ AI.");
            }

        } catch (err) {
            console.error("Lỗi chi tiết:", err);
            alert("❌ Lỗi phục chế: " + err.message);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    if (btnProcess) btnProcess.addEventListener('click', processImage);
    if (btnOutfit) btnOutfit.addEventListener('click', processImage);

    // 4. Nút Reset
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            selectedFile = null;
            fileInput.value = '';
            originalPreview.style.display = 'none';
            uploadLabel.style.display = 'block';
            resultImage.style.display = 'none';
            placeholderText.style.display = 'block';
            if (btnDownload) btnDownload.style.display = 'none';
            
            if (!isLoggedIn) {
                btnProcess.disabled = true;
                btnProcess.innerText = "Phục Chế Ảnh (Cần Kết Nối)";
            }
        });
    }
});