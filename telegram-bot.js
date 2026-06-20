// ==========================================================================
// TELEGRAM BOT COMPANION DAEMON (ZERO DEPENDENCY NODE.JS WORKER WITH GEMINI AI)
// ==========================================================================

const botToken = process.env.BOT_TOKEN || "8837753488:AAF2I8nWU9zBMR1813mcgEuxqKSWvCuvtEM";
const projectId = process.env.FIREBASE_PROJECT_ID || "flutter-ai-playgroun-a16ad";
const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tasks`;

let offset = 0;
let cachedGeminiKey = "";
let lastKeyFetchTime = 0;

// Log startup message
console.log("🤖 Telegram Bot Companion AI đang chạy...");
console.log("🔗 Bot Username: @NhacviecSuperVip_bot");
console.log("📡 Đang lắng nghe tin nhắn và sẵn sàng tương tác tự nhiên...");

// Helper: HTTP requests
async function makeRequest(url, method = 'GET', body = null) {
    const options = { method };
    if (body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }
    return await res.json();
}

// Fetch Gemini API Key from Firestore settings/config
async function getGeminiApiKey() {
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }

    const now = Date.now();
    // Cache for 60 seconds to prevent Firestore rate limits
    if (now - lastKeyFetchTime < 60000 && cachedGeminiKey) {
        return cachedGeminiKey;
    }
    
    try {
        const configUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/config`;
        const data = await makeRequest(configUrl);
        if (data && data.fields && data.fields.geminiApiKey) {
            const key = data.fields.geminiApiKey.stringValue.trim();
            if (key !== cachedGeminiKey) {
                cachedGeminiKey = key;
                if (key) console.log("🔑 Đã đồng bộ khóa Gemini API mới từ Firestore!");
            }
        }
    } catch (e) {
        // Document might not exist, silently fail and retry in 60s
    }
    lastKeyFetchTime = now;
    return cachedGeminiKey;
}

// Helper: Send message to Telegram
async function sendMessage(chatId, text) {
    try {
        await makeRequest(`https://api.telegram.org/bot${botToken}/sendMessage`, 'POST', {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (e) {
        console.error("❌ Không thể gửi tin nhắn Telegram:", e.message);
    }
}

// Fetch tasks from Firestore REST API
async function fetchTasksFromFirestore() {
    try {
        const data = await makeRequest(firestoreUrl);
        if (!data.documents) return [];
        
        return data.documents.map(doc => {
            const fields = doc.fields;
            const pathParts = doc.name.split('/');
            const id = pathParts[pathParts.length - 1];
            
            return {
                id: id,
                title: fields.title ? fields.title.stringValue : "",
                desc: fields.desc ? fields.desc.stringValue : "",
                date: fields.date ? fields.date.stringValue : "",
                time: fields.time ? fields.time.stringValue : "",
                priority: fields.priority ? fields.priority.stringValue : "medium",
                category: fields.category ? fields.category.stringValue : "Công việc",
                recurrence: fields.recurrence ? fields.recurrence.stringValue : "none",
                status: fields.status ? fields.status.stringValue : "todo",
                alarmed: fields.alarmed ? fields.alarmed.booleanValue : false
            };
        });
    } catch (e) {
        console.error("❌ Lỗi khi lấy danh sách từ Firestore:", e.message);
        return [];
    }
}

// Save/update task in Firestore REST API
async function saveTaskToFirestore(task) {
    try {
        const url = `${firestoreUrl}/${task.id}`;
        const payload = {
            fields: {
                id: { stringValue: task.id },
                title: { stringValue: task.title },
                desc: { stringValue: task.desc || "" },
                date: { stringValue: task.date },
                time: { stringValue: task.time },
                priority: { stringValue: task.priority || "medium" },
                category: { stringValue: task.category || "Công việc" },
                recurrence: { stringValue: task.recurrence || "none" },
                status: { stringValue: task.status || "todo" },
                alarmed: { booleanValue: task.alarmed || false }
            }
        };
        await makeRequest(url, 'PATCH', payload);
        return true;
    } catch (e) {
        console.error("❌ Lỗi khi lưu vào Firestore:", e.message);
        return false;
    }
}

// Parse dates to YYYY-MM-DD local
function getTodayDateString() {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const local = new Date(utc + (3600000 * 7)); // Vietnam GMT+7
    
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Helper: Extract date from text in local fallback mode
function parseDateFromText(text) {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const local = new Date(utc + (3600000 * 7)); // Vietnam GMT+7

    let dateMatch = false;

    if (/\b(hôm nay)\b/i.test(text)) {
        dateMatch = true; // keep today
    } else if (/\b(ngày mai|mai)\b/i.test(text)) {
        local.setDate(local.getDate() + 1);
        dateMatch = true;
    } else if (/\b(ngày mốt|mốt)\b/i.test(text)) {
        local.setDate(local.getDate() + 2);
        dateMatch = true;
    } else if (/\b(hôm qua)\b/i.test(text)) {
        local.setDate(local.getDate() - 1);
        dateMatch = true;
    } else {
        // Match formats: DD/MM/YYYY, DD-MM-YYYY, DD/MM, DD-MM
        const regex = /(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?/;
        const match = text.match(regex);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const year = match[3] ? parseInt(match[3], 10) : local.getFullYear();
            local.setFullYear(year, month, day);
            dateMatch = true;
        }
    }
    
    if (!dateMatch) return null;

    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Call Gemini API to parse natural language message
async function callGeminiNLP(text, currentTasks, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const todayStr = getTodayDateString();
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const local = new Date(utc + (3600000 * 7));
    const timeStr = local.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const systemPrompt = 
        `Bạn là trợ lý AI thông minh tích hợp trong bot Telegram của Phần Mềm Nhắc Việc (Smart Reminder). ` +
        `Người dùng Việt Nam sẽ nhắn tin tự nhiên với bạn (không gò bó cú pháp). Nhiệm vụ của bạn là phân tích và phản hồi. ` +
        `Thông tin thời gian hiện tại: Ngày ${todayStr}, lúc ${timeStr}. ` +
        `Danh sách TẤT CẢ công việc: ${JSON.stringify(currentTasks)}. ` +
        `Bạn PHẢI trả về duy nhất dữ liệu dạng JSON. Không thêm block markdown \`\`\`json hay bất kỳ văn bản nào khác ngoài JSON. ` +
        `Định dạng JSON bắt buộc phải khớp cấu trúc sau:\n` +
        `{\n` +
        `  "intent": "add" | "list" | "done" | "chat",\n` +
        `  "task": { "title": "tên công việc", "time": "HH:MM", "date": "YYYY-MM-DD" } (chỉ điền khi intent là add),\n` +
        `  "taskId": "id của công việc" (chỉ điền khi intent là done),\n` +
        `  "reply": "Câu trả lời trò chuyện. Nếu user yêu cầu danh sách, hãy tự liệt kê danh sách công việc phù hợp vào đây một cách trực quan."\n` +
        `}`;

    const body = {
        contents: [
            { role: "user", parts: [{ text: text }] }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const res = await makeRequest(url, 'POST', body);
    const rawText = res.candidates[0].content.parts[0].text.trim();
    return JSON.parse(rawText);
}

// Call Pollinations API (Free AI) to parse natural language message
async function callPollinationsNLP(text, currentTasks) {
    const todayStr = getTodayDateString();
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const local = new Date(utc + (3600000 * 7));
    const timeStr = local.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const systemPrompt = 
        `Bạn là trợ lý AI thông minh tích hợp trong bot Telegram của Phần Mềm Nhắc Việc (Smart Reminder). ` +
        `Người dùng sẽ nhắn tin tự nhiên. Nhiệm vụ của bạn là phân tích và phản hồi. ` +
        `Thời gian hiện tại: Ngày ${todayStr}, lúc ${timeStr}. ` +
        `Danh sách TẤT CẢ công việc: ${JSON.stringify(currentTasks)}. ` +
        `Bạn PHẢI trả về duy nhất dữ liệu dạng JSON. Không thêm markdown (như \`\`\`json). ` +
        `Định dạng JSON:\n` +
        `{\n` +
        `  "intent": "add" | "list" | "done" | "chat",\n` +
        `  "task": { "title": "tên công việc", "time": "HH:MM", "date": "YYYY-MM-DD" } (khi add),\n` +
        `  "taskId": "id của công việc" (khi done),\n` +
        `  "reply": "Câu trả lời thân thiện tiếng Việt. Nếu user hỏi danh sách, hãy tự liệt kê trực tiếp vào đây."\n` +
        `}\n\n` +
        `Tin nhắn của người dùng: "${text}"`;

    const url = "https://text.pollinations.ai/" + encodeURIComponent(systemPrompt) + "?json=true";
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        console.error("Pollinations API response:", errorText);
        throw new Error("Pollinations API Error");
    }
    const textRes = await res.text();
    
    const cleanText = textRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
}

// Process intent and perform Firestore updates
async function processParsedIntent(chatId, parsed) {
    const todayStr = getTodayDateString();
    
    if (parsed.intent === 'add') {
        const { title, time, date } = parsed.task || {};
        if (!title || !time) {
            await sendMessage(chatId, parsed.reply || "❌ Không tìm thấy thông tin công việc hoặc thời gian.");
            return;
        }
        
        const newId = 'task-' + Date.now();
        const newTask = {
            id: newId,
            title: title,
            desc: `Thêm qua Chat AI Telegram`,
            date: date || todayStr,
            time: time,
            priority: 'medium',
            category: 'Công việc',
            recurrence: 'none',
            status: 'todo',
            alarmed: false
        };
        
        const success = await saveTaskToFirestore(newTask);
        if (success) {
            await sendMessage(chatId, parsed.reply);
        } else {
            await sendMessage(chatId, "❌ Lỗi hệ thống: Không thể lưu tác vụ lên Firestore.");
        }
    } 
    else if (parsed.intent === 'done') {
        const taskId = parsed.taskId;
        if (!taskId) {
            await sendMessage(chatId, parsed.reply || "❌ Không xác định được công việc cần hoàn thành.");
            return;
        }
        
        const tasks = await fetchTasksFromFirestore();
        const targetTask = tasks.find(t => t.id === taskId);
        
        if (!targetTask) {
            await sendMessage(chatId, `❌ Không tìm thấy công việc này trên hệ thống.`);
            return;
        }
        
        targetTask.status = 'completed';
        const success = await saveTaskToFirestore(targetTask);
        
        if (success) {
            await sendMessage(chatId, parsed.reply);
        } else {
            await sendMessage(chatId, "❌ Lỗi hệ thống: Không thể hoàn thành công việc trên Firestore.");
        }
    } 
    else if (parsed.intent === 'list') {
        await sendMessage(chatId, parsed.reply);
    } 
    else {
        // chat intent or chat fallback
        await sendMessage(chatId, parsed.reply);
    }
}

// Native regex-based Vietnamese NLP parser fallback if no Gemini key is provided
async function handleFallbackNLP(chatId, text, username) {
    const todayStr = getTodayDateString();
    
    // 1. Check for casual chat statements first
    if (/^(sao ngu vậy|ngu|kém|dốt|chán|sao ngu the)/i.test(text)) {
        await sendMessage(chatId, `Hì hì, xin lỗi bạn nhiều nhé! 🥺 Hiện tại do bạn chưa nhập **Gemini API Key** trên trang Cài đặt Web nên mình đang phải xử lý tin nhắn bằng chế độ offline (regex) thô sơ.\n\n👉 Bạn hãy lấy một mã khóa AI miễn phí tại [Google AI Studio](https://aistudio.google.com/) rồi dán vào mục Cài đặt Web để mình thông minh hơn và trò chuyện tự nhiên bằng AI nhé! 🤖`);
        return;
    }
    
    if (/^(ok|được|yes|ừ|ok bot)/i.test(text)) {
        await sendMessage(chatId, `Dạ vâng ạ! Bạn có việc gì cần mình nhắc nhở không?`);
        return;
    }

    if (/^(cảm ơn|cám ơn|thanks|thank you|cảm ơn bot)/i.test(text)) {
        await sendMessage(chatId, `Không có gì đâu nè! Rất vui được hỗ trợ bạn. Chúc bạn có một ngày tuyệt vời nhé! ❤️`);
        return;
    }

    // 2. Query date check (looks for mốt, mai, 22/6, etc.)
    const parsedDate = parseDateFromText(text);
    if (parsedDate && /(việc|lịch|gì không|danh sách|có việc)/i.test(text)) {
        const tasks = await fetchTasksFromFirestore();
        const dateTasks = tasks.filter(t => t.date === parsedDate);
        dateTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        const dateObj = new Date(parsedDate);
        const formattedDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        if (dateTasks.length === 0) {
            await sendMessage(chatId, `📅 Bạn không có nhắc nhở nào trong ngày *${formattedDate}*!`);
            return;
        }
        
        let reply = `📅 *Danh sách nhắc nhở ngày ${formattedDate}:*\n\n`;
        dateTasks.forEach((task, idx) => {
            const statusEmoji = task.status === 'completed' ? '✅' : '⏳';
            reply += `${idx + 1}. [${statusEmoji}] \`[${task.time}]\` *${task.title}*\n`;
        });
        await sendMessage(chatId, reply);
        return;
    }
    
    // 3. Simple list check fallback (today)
    if (/(danh sách|lịch hôm nay|việc hôm nay|có việc gì|làm gì|chưa xong)/i.test(text)) {
        const tasks = await fetchTasksFromFirestore();
        const todayTasks = tasks.filter(t => t.date === todayStr);
        todayTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        if (todayTasks.length === 0) {
            await sendMessage(chatId, `📅 Bạn không có nhắc nhở nào trong hôm nay (*${todayStr}*)!`);
            return;
        }
        
        let reply = `📅 *Danh sách nhắc nhở hôm nay (${todayStr}):*\n\n`;
        todayTasks.forEach((task, idx) => {
            const statusEmoji = task.status === 'completed' ? '✅' : '⏳';
            reply += `${idx + 1}. [${statusEmoji}] \`[${task.time}]\` *${task.title}*\n`;
        });
        await sendMessage(chatId, reply);
        return;
    }
    
    // 4. Done intent check
    const doneMatch = text.match(/(xong|hoàn thành|đã làm xong)\s*(việc)?\s*(\d+)/i);
    if (doneMatch) {
        const index = parseInt(doneMatch[3], 10);
        const tasks = await fetchTasksFromFirestore();
        const todayTasks = tasks.filter(t => t.date === todayStr);
        todayTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        if (index > 0 && index <= todayTasks.length) {
            const targetTask = todayTasks[index - 1];
            targetTask.status = 'completed';
            await saveTaskToFirestore(targetTask);
            await sendMessage(chatId, `✅ Đã đánh dấu hoàn thành việc thứ ${index}: *"${targetTask.title}"*`);
        } else {
            await sendMessage(chatId, `❌ Không tìm thấy công việc số ${index} trong ngày hôm nay.`);
        }
        return;
    }
    
    // 5. Add intent check
    const addKeywords = /(nhắc|thêm|cần|phải|tạo)/i.test(text);
    const timeRegex = /(?:lúc\s+)?([0-2]?[0-9])[:h]([0-5][0-9])?\s*(chiều|tối|đêm|sáng)?/i;
    const timeMatch = text.match(timeRegex);
    
    if (addKeywords && timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        let minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3] ? timeMatch[3].toLowerCase() : "";
        
        if (period === 'chiều' || period === 'tối' || period === 'đêm') {
            if (hour < 12) hour += 12;
        }
        
        const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        // Extract title
        let title = text
            .replace(/(nhắc tôi|nhắc|thêm việc|thêm|tôi cần|cần phải|tạo)/ig, '')
            .replace(timeRegex, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        if (title.startsWith('là ')) title = title.substring(3).trim();
        if (title.startsWith('đi ')) title = title.substring(3).trim();
        
        if (title) {
            const newId = 'task-' + Date.now();
            const newTask = {
                id: newId,
                title: title,
                desc: `Thêm từ chat tự nhiên`,
                date: todayStr,
                time: formattedTime,
                priority: 'medium',
                category: 'Công việc',
                recurrence: 'none',
                status: 'todo',
                alarmed: false
            };
            
            await saveTaskToFirestore(newTask);
            await sendMessage(chatId, `✅ Đã thêm nhắc nhở:\n📌 *Nhiệm vụ:* ${title}\n⏰ *Thời gian:* hôm nay lúc \`${formattedTime}\``);
            return;
        }
    }
    
    // 6. Generic date-only check (e.g., if user just sends "22/6")
    if (parsedDate) {
        const tasks = await fetchTasksFromFirestore();
        const dateTasks = tasks.filter(t => t.date === parsedDate);
        dateTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        const dateObj = new Date(parsedDate);
        const formattedDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        if (dateTasks.length === 0) {
            await sendMessage(chatId, `📅 Bạn không có nhắc nhở nào trong ngày *${formattedDate}*!`);
        } else {
            let reply = `📅 *Danh sách nhắc nhở ngày ${formattedDate}:* \n\n`;
            dateTasks.forEach((task, idx) => {
                const statusEmoji = task.status === 'completed' ? '✅' : '⏳';
                reply += `${idx + 1}. [${statusEmoji}] \`[${task.time}]\` *${task.title}*\n`;
            });
            await sendMessage(chatId, reply);
        }
        return;
    }

    // 7. Greeting Fallback
    if (/(chào|hi|hello|alo|bot ơi|ơi)/i.test(text)) {
        await sendMessage(chatId, `Chào bạn *${username}*! Mình là Trợ lý nhắc nhở. Bạn có thể trò chuyện tự nhiên với mình:\n\n` +
                                  `*Ví dụ:* \n` +
                                  `👉 "nhắc tôi đi mua sữa lúc 17:30"\n` +
                                  `👉 "mốt có việc gì làm không bot"\n` +
                                  `👉 "xong việc số 1 rồi nha"\n\n` +
                                  `💡 _Mẹo: Nhập khóa Gemini API trong phần Cài đặt Web để kích hoạt AI hiểu ngôn ngữ cực đỉnh nhé!_`);
    } else {
        await sendMessage(chatId, `❓ Mình chưa hiểu ý bạn lắm. Bạn thử nói lại rõ ràng hơn nhé:\n\n` +
                                  `👉 Để hỏi lịch: "mai có lịch gì không", "22/6 có việc gì không"\n` +
                                  `👉 Để thêm việc: "nhắc tôi họp lúc 15h"\n` +
                                  `👉 Để hoàn thành: "xong việc số 1"`);
    }
}

// Unified Message Handler
async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text ? message.text.trim() : "";
    const username = message.from.first_name || "bạn";

    if (!text) return;

    // Check if the command is system command (/start or /help)
    if (text.startsWith('/start') || text.startsWith('/help')) {
        const reply = `Xin chào *${username}*! Chào mừng bạn đến với **Phần Mềm Nhắc Việc (Smart Reminder)** ⏰\n\n` +
                      `🔑 Chat ID của bạn là: \`${chatId}\`\n` +
                      `👉 Hãy sao chép ID này và dán vào phần **Cài đặt -> Thông báo Telegram** trên trình duyệt để nhận chuông báo trực tiếp về điện thoại khi đến giờ hẹn!\n\n` +
                      `💬 Từ bây giờ, bạn có thể **trò chuyện tự nhiên bằng tiếng Việt** với mình, không cần gò bó câu lệnh nữa!\n` +
                      `*Ví dụ:* \n` +
                      `👉 "Nhắc tôi đi uống cà phê lúc 3h chiều"\n` +
                      `👉 "Hôm nay mình cần làm những gì"\n` +
                      `👉 "Đã xong việc số 2 rồi nhé"`;
        await sendMessage(chatId, reply);
        return;
    }

    const geminiKey = await getGeminiApiKey();

    if (geminiKey) {
        try {
            console.log(`🤖 [Gemini AI Mode] Đang xử lý tin nhắn: "${text}"`);
            const tasks = await fetchTasksFromFirestore();
            
            const parsed = await callGeminiNLP(text, tasks, geminiKey);
            await processParsedIntent(chatId, parsed);
        } catch (e) {
            console.error("❌ Lỗi khi xử lý bằng Gemini, chuyển hướng về Fallback Parser:", e.message);
            await handleFallbackNLP(chatId, text, username);
        }
    } else {
        try {
            console.log(`🌐 [Free AI Mode - Pollinations] Đang xử lý tin nhắn: "${text}"`);
            const tasks = await fetchTasksFromFirestore();
            
            // To prevent AI response from taking too long, notify user that we are typing
            await makeRequest(`https://api.telegram.org/bot${botToken}/sendChatAction`, 'POST', {
                chat_id: chatId,
                action: 'typing'
            });

            const parsed = await callPollinationsNLP(text, tasks);
            await processParsedIntent(chatId, parsed);
        } catch (e) {
            console.error("❌ Lỗi Free AI, dùng Local Regex Mode:", e.message);
            await handleFallbackNLP(chatId, text, username);
        }
    }
}

// Core Long Polling Loop
async function startPolling() {
    while (true) {
        try {
            const data = await makeRequest(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=15`);
            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    offset = update.update_id + 1;
                    if (update.message) {
                        await handleMessage(update.message);
                    }
                }
            }
        } catch (e) {
            console.error("⚠️ Lỗi vòng lặp Telegram API:", e.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

// Start polling
startPolling();
