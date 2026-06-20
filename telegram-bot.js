// ==========================================================================
// TELEGRAM BOT COMPANION DAEMON (ZERO DEPENDENCY NODE.JS WORKER WITH GEMINI AI)
// ==========================================================================

const botToken = "8837753488:AAF2I8nWU9zBMR1813mcgEuxqKSWvCuvtEM";
const projectId = "flutter-ai-playgroun-a16ad";
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
        `Danh sách công việc hôm nay hiện tại: ${JSON.stringify(currentTasks)}. ` +
        `Bạn PHẢI trả về duy nhất dữ liệu dạng JSON. Không thêm block markdown \`\`\`json hay bất kỳ văn bản nào khác ngoài JSON. ` +
        `Định dạng JSON bắt buộc phải khớp cấu trúc sau:\n` +
        `{\n` +
        `  "intent": "add" | "list" | "done" | "chat",\n` +
        `  "task": { "title": "tên công việc", "time": "HH:MM" } (chỉ điền khi intent là add),\n` +
        `  "targetIndex": number (chỉ điền số thứ tự từ 1 của công việc khi intent là done),\n` +
        `  "reply": "Câu trả lời trò chuyện thân thiện bằng tiếng Việt phù hợp ngữ cảnh, thông báo công việc bạn đã làm (ví dụ: đã thêm, đã đánh dấu hoàn thành) hoặc trả lời thông thường nếu người dùng chỉ đang tán gẫu."\n` +
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

// Process intent and perform Firestore updates
async function processParsedIntent(chatId, parsed) {
    const todayStr = getTodayDateString();
    
    if (parsed.intent === 'add') {
        const { title, time } = parsed.task;
        if (!title || !time) {
            await sendMessage(chatId, parsed.reply || "❌ Không tìm thấy thông tin công việc hoặc thời gian.");
            return;
        }
        
        const newId = 'task-' + Date.now();
        const newTask = {
            id: newId,
            title: title,
            desc: `Thêm qua Chat AI Telegram`,
            date: todayStr,
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
        const index = parsed.targetIndex;
        if (!index || index <= 0) {
            await sendMessage(chatId, parsed.reply || "❌ Vui lòng cung cấp số thứ tự công việc cần hoàn thành.");
            return;
        }
        
        const tasks = await fetchTasksFromFirestore();
        const todayTasks = tasks.filter(t => t.date === todayStr);
        todayTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        if (index > todayTasks.length) {
            await sendMessage(chatId, `❌ Số thứ tự ${index} không có trong danh sách việc hôm nay.`);
            return;
        }
        
        const targetTask = todayTasks[index - 1];
        targetTask.status = 'completed';
        const success = await saveTaskToFirestore(targetTask);
        
        if (success) {
            await sendMessage(chatId, parsed.reply);
        } else {
            await sendMessage(chatId, "❌ Lỗi hệ thống: Không thể hoàn thành công việc trên Firestore.");
        }
    } 
    else if (parsed.intent === 'list') {
        const tasks = await fetchTasksFromFirestore();
        const todayTasks = tasks.filter(t => t.date === todayStr);
        todayTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        let response = parsed.reply + "\n\n";
        if (todayTasks.length === 0) {
            response += `📅 Lịch trình hôm nay trống.`;
        } else {
            todayTasks.forEach((t, i) => {
                const statusEmoji = t.status === 'completed' ? '✅' : '⏳';
                response += `${i + 1}. [${statusEmoji}] \`[${t.time}]\` *${t.title}*\n`;
            });
        }
        await sendMessage(chatId, response);
    } 
    else {
        // chat intent or chat fallback
        await sendMessage(chatId, parsed.reply);
    }
}

// Native regex-based Vietnamese NLP parser fallback if no Gemini key is provided
async function handleFallbackNLP(chatId, text, username) {
    const todayStr = getTodayDateString();
    
    // 1. List intent check
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
    
    // 2. Done intent check
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
    
    // 3. Add intent check
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
        
        // Extract title: remove keywords and the matched time expression
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
    
    // 4. Chat/Greeting Fallback
    if (/(chào|hi|hello|alo|bot ơi|ơi)/i.test(text)) {
        await sendMessage(chatId, `Chào bạn *${username}*! Mình là Trợ lý nhắc nhở thông minh. Bạn có thể trò chuyện tự nhiên với mình:\n\n` +
                                  `*Ví dụ:* \n` +
                                  `👉 "nhắc tôi đi mua đồ lúc 17:30"\n` +
                                  `👉 "hôm nay mình cần làm gì thế"\n` +
                                  `👉 "xong việc số 1 rồi"\n\n` +
                                  `💡 _Mẹo: Nhập khóa Gemini API trong phần Cài đặt Web để kích hoạt khả năng hiểu ngôn ngữ siêu đỉnh của AI nhé!_`);
    } else {
        await sendMessage(chatId, `❓ Mình chưa hiểu ý bạn lắm. Bạn thử nói lại rõ ràng hơn (ví dụ: "nhắc tôi họp lúc 15h" hoặc "hôm nay có việc gì không") nhé!`);
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
            const todayStr = getTodayDateString();
            const tasks = await fetchTasksFromFirestore();
            const todayTasks = tasks.filter(t => t.date === todayStr);
            todayTasks.sort((a, b) => a.time.localeCompare(b.time));
            
            const parsed = await callGeminiNLP(text, todayTasks, geminiKey);
            await processParsedIntent(chatId, parsed);
        } catch (e) {
            console.error("❌ Lỗi khi xử lý bằng Gemini, chuyển hướng về Fallback Parser:", e.message);
            await handleFallbackNLP(chatId, text, username);
        }
    } else {
        console.log(`📡 [Local Parsing Mode] Đang xử lý tin nhắn: "${text}"`);
        await handleFallbackNLP(chatId, text, username);
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
