export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { promptText, base64Data, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Chưa cài đặt GEMINI_API_KEY trên Vercel.' });

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: promptText },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }],
                    // Thêm cấu hình hạ mức kiểm duyệt an toàn để không bị chặn ảnh chân dung/ảnh cũ
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Lỗi từ Google API' });
        }

        // Kiểm tra nếu bị chặn do lý do khác
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== "STOP") {
            return.status(200).json({ 
                candidates: [{ 
                    content: { 
                        parts: [{ text: `AI đã từ chối xử lý ảnh này do quy tắc an toàn (Lý do: ${candidate.finishReason}). Hãy thử đổi sang ảnh khác hoặc sửa lại Prompt.` }] 
                    } 
                }] 
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}