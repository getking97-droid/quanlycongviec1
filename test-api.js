const text = "7 giờ 45 phút sáng ngày 22/6/2026 hãy gửi tin nhắn nhắc tôi làm báo cáo";
const systemPrompt = `Bạn là trợ lý AI phân tích ý định.
Văn bản: "${text}"
Trả về định dạng JSON duy nhất không kèm markdown:
{ "intent": "add", "task": { "title": "tên công việc", "time": "HH:MM" } }`;

async function test() {
    const url = "https://text.pollinations.ai/" + encodeURIComponent(systemPrompt) + "?json=true";
    try {
        const res = await fetch(url);
        const data = await res.text();
        console.log("RESPONSE:", data);
    } catch(e) {
        console.log("ERROR:", e);
    }
}
test();
