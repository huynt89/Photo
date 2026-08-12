// ⚠️ THAY BẰNG CLIENT ID THẬT CỦA BẠN Ở ĐÂY
const GOOGLE_CLIENT_ID = "894418983821-fjoc610mc93qirdoq67i1ufktq9jboc4.apps.googleusercontent.com";

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

    // ==========================================
    // 1. TÍCH HỢP GOOGLE SIGN-IN THẬT
    // ==========================================
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    function handleCredentialResponse(response) {
        const user = parseJwt(response.credential);
        if (user) {
            isLoggedIn = true;
            authStatus.className = "status-box connected";
            authStatus.innerHTML = `🟢 ${user.name} (${user.email})`;
            customGoogleBtn.style.display = "none";

            if (selectedFile) {
                btnProcess.disabled = false;
                btnProcess.innerText = "Phục Chế Ảnh Ngay";
            }
        }
    }

    // Khởi tạo thư viện Google Auth
    if (window.google) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
    }

    // Sự kiện khi bấm nút Đăng nhập -> Mở popup Google chọn tài khoản
    if (customGoogleBtn) {
        customGoogleBtn.addEventListener('click', () => {
            if (window.google) {
                google.accounts.id.prompt(); // Hiện bảng chọn tài khoản Google
            } else {
                alert("Đang tải dịch vụ Google, vui lòng thử lại sau vài giây!");
            }
        });
    }

    // ==========================================
    // 2. TẢI VÀ XEM TRƯỚC ẢNH
    // ==========================================
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

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

    // ==========================================
    // 3. XỬ LÝ GỌI AI (TRỰC TIẾP, KHÔNG QUA PROXY)
    // ==========================================
    async function processImage() {
        if (!selectedFile) {
            alert("Vui lòng chọn ảnh!");
            return;
        }

        loadingOverlay.style.display = 'flex';
        loadingText.innerText = "⏳ Đang gửi ảnh trực tiếp đến máy chủ AI (Đợi 15-30s)...";

        try {
            // Chuyển ảnh thành Base64
            const base64Image = await fileToBase64(selectedFile);
            
            // GỌI TRỰC TIẾP vào cổng API chuẩn của Gradio (Không dùng Proxy)
            const targetUrl = "https://sczhou-codeformer.hf.space/run/predict";

            const response = await fetch(targetUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fn_index: 0,
                    data: [
                        base64Image, // [0] Ảnh gốc
                        true,        // [1] Làm nét nền (background_enhance)
                        true,        // [2] Làm nét mặt (face_upsample)
                        2,           // [3] Phóng to 2x (upscale)
                        0.5          // [4] Độ chân thực (fidelity)
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status} - Máy chủ AI đang quá tải hoặc bảo trì.`);
            }

            const data = await response.json();
            
            // Xử lý dữ liệu trả về (Gradio có thể trả về Link hoặc Object chứa File)
            if (data && data.data && data.data.length > 0) {
                let resultUrl = "";
                const output = data.data[0];

                if (typeof output === 'string') {
                    // Nếu AI trả về chuỗi Base64 hoặc URL trực tiếp
                    resultUrl = output.startsWith("http") || output.startsWith("data:") 
                        ? output 
                        : `https://sczhou-codeformer.hf.space/file=${output}`;
                } else if (typeof output === 'object') {
                    // Nếu AI trả về dạng Object (Gradio 3/4 format)
                    if (output.url) {
                        resultUrl = output.url;
                    } else if (output.name) {
                        resultUrl = `https://sczhou-codeformer.hf.space/file=${output.name}`;
                    }
                }

                if (resultUrl) {
                    // Hiển thị ảnh thành công
                    resultImage.src = resultUrl;
                    resultImage.style.display = 'block';
                    placeholderText.style.display = 'none';

                    // Cập nhật nút Tải về
                    if (btnDownload) {
                        btnDownload.href = resultUrl;
                        btnDownload.style.display = 'block';
                    }
                } else {
                    throw new Error("Không thể trích xuất ảnh từ hệ thống AI.");
                }
            } else {
                throw new Error("Dữ liệu trả về từ AI bị trống.");
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

    // ==========================================
    // 4. RESET
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
            
            if (!isLoggedIn) {
                btnProcess.disabled = true;
                btnProcess.innerText = "Phục Chế Ảnh (Cần Kết Nối)";
            }
        });
    }
});