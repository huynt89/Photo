export default async function handler(req, res) {
    // ==============================
    // CORS
    // ==============================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method Not Allowed'
        });
    }

    // ==============================
    // Nhận dữ liệu từ frontend
    // ==============================
    const {
        promptText,
        base64Data,
        mimeType
    } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;

    // ==============================
    // Kiểm tra API KEY
    // ==============================
    if (!apiKey) {
        return res.status(500).json({
            error: 'Chưa cài đặt GEMINI_API_KEY trên Vercel.'
        });
    }

    // ==============================
    // Kiểm tra dữ liệu ảnh
    // ==============================
    if (!base64Data) {
        return res.status(400).json({
            error: 'Không nhận được dữ liệu ảnh.'
        });
    }

    if (!mimeType) {
        return res.status(400).json({
            error: 'Không xác định được định dạng ảnh.'
        });
    }

    // ==============================
    // Prompt mặc định
    // ==============================
    const finalPrompt = promptText || `
Phục chế bức ảnh cũ này.

Yêu cầu:
- Giữ nguyên khuôn mặt và nhận dạng của người trong ảnh.
- Khôi phục các chi tiết bị mờ, xước, rách hoặc xuống cấp.
- Khử nhiễu và các vết bẩn.
- Cải thiện độ nét nhưng giữ vẻ tự nhiên.
- Không tự ý thay đổi bố cục.
- Không thêm người hoặc vật thể mới.
- Nếu ảnh là ảnh đen trắng thì giữ phong cách ảnh gốc trừ khi được yêu cầu tô màu.
- Kết quả phải trông giống một bức ảnh thật được phục chế.
`;

    try {

        // ==============================
        // Gọi Gemini API
        // ==============================
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },

                body: JSON.stringify({

                    contents: [
                        {
                            role: 'user',

                            parts: [
                                {
                                    text: finalPrompt
                                },

                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ],

                    // QUAN TRỌNG:
                    // Yêu cầu Gemini trả về ảnh
                    generationConfig: {
                        responseModalities: ['IMAGE']
                    }
                })
            }
        );

        // ==============================
        // Đọc response
        // ==============================
        const data = await response.json();

        console.log(
            'Gemini HTTP status:',
            response.status
        );

        console.log(
            'Gemini response:',
            JSON.stringify(data)
        );

        // ==============================
        // Gemini trả lỗi
        // ==============================
        if (!response.ok) {

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    'Lỗi từ Google Gemini API',

                details: data?.error || null
            });
        }

        // ==============================
        // Lấy candidate
        // ==============================
        const candidate =
            data?.candidates?.[0];

        if (!candidate) {

            return res.status(500).json({
                error: 'Gemini không trả về kết quả.',
                details: data
            });
        }

        // ==============================
        // Kiểm tra finishReason
        // ==============================
        if (
            candidate.finishReason &&
            candidate.finishReason !== 'STOP'
        ) {

            return res.status(400).json({
                error:
                    `Gemini không hoàn thành việc xử lý ảnh. ` +
                    `Lý do: ${candidate.finishReason}`,

                details: candidate
            });
        }

        // ==============================
        // Tìm ảnh Gemini trả về
        // ==============================
        const parts =
            candidate?.content?.parts || [];

        let imagePart = null;
        let textPart = '';

        for (const part of parts) {

            // Gemini image response
            if (part.inlineData) {
                imagePart = part.inlineData;
            }

            // Nếu Gemini có trả thêm text
            if (part.text) {
                textPart += part.text;
            }
        }

        // ==============================
        // Không tìm thấy ảnh
        // ==============================
        if (!imagePart?.data) {

            return res.status(500).json({
                error: 'Gemini không trả về dữ liệu ảnh.',
                text: textPart,
                details: data
            });
        }

        // ==============================
        // Trả ảnh về frontend
        // ==============================
        return res.status(200).json({

            success: true,

            image: {
                mimeType:
                    imagePart.mimeType ||
                    'image/png',

                data:
                    imagePart.data
            },

            text: textPart || ''
        });

    } catch (error) {

        console.error(
            'Gemini API error:',
            error
        );

        return res.status(500).json({
            error:
                error?.message ||
                'Lỗi không xác định khi gọi Gemini API.'
        });
    }
}