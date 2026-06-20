// ==========================================================================
// TELEGRAM BOT COMPANION DAEMON (ZERO DEPENDENCY NODE.JS WORKER)
// ==========================================================================

const botToken = "8837753488:AAF2I8nWU9zBMR1813mcgEuxqKSWvCuvtEM";
const projectId = "flutter-ai-playgroun-a16ad";
const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tasks`;

let offset = 0;

// Log startup message
console.log("🤖 Telegram Bot Companion đang chạy...");
console.log("🔗 Bot Username: @NhacviecSuperVip_bot");
console.log("📡 Đang lắng nghe tin nhắn từ Telegram...");

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
    // Adjust to local Vietnam time offset +7
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const local = new Date(utc + (3600000 * 7));
    
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Handler for messages
async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text ? message.text.trim() : "";
    const username = message.from.first_name || "bạn";

    if (!text) return;

    console.log(`💬 Nhận tin nhắn từ [${username}] (Chat ID: ${chatId}): "${text}"`);

    // Command: /start or /help
    if (text.startsWith('/start') || text.startsWith('/help')) {
        const reply = `Xin chào *${username}*! Chào mừng bạn đến với **Phần Mềm Nhắc Việc (Smart Reminder)** ⏰\n\n` +
                      `🔑 Chat ID của bạn là: \`${chatId}\`\n` +
                      `👉 Hãy sao chép ID này và dán vào phần **Cài đặt -> Thông báo Telegram** trên trình duyệt để nhận chuông báo trực tiếp về điện thoại khi đến giờ hẹn!\n\n` +
                      `*Các câu lệnh tương tác của Bot:*\n` +
                      `📅 \`/list\` - Xem danh sách nhắc nhở hôm nay\n` +
                      `➕ \`/add [tên công việc] [HH:MM]\` - Thêm nhanh nhắc việc hôm nay (Ví dụ: \`/add Họp nhóm dự án 15:30\`)\n` +
                      `✅ \`/done [Số thứ tự]\` - Đánh dấu hoàn thành công việc theo số thứ tự`;
        await sendMessage(chatId, reply);
        return;
    }

    // Command: /list
    if (text.startsWith('/list')) {
        const todayStr = getTodayDateString();
        const tasks = await fetchTasksFromFirestore();
        
        // Filter tasks due today
        const todayTasks = tasks.filter(t => t.date === todayStr);
        // Sort by time ascending
        todayTasks.sort((a, b) => a.time.localeCompare(b.time));

        if (todayTasks.length === 0) {
            await sendMessage(chatId, `📅 Bạn không có lịch nhắc nhở nào trong hôm nay (*${todayStr}*)!`);
            return;
        }

        let reply = `📅 *Danh sách nhắc nhở hôm nay (${todayStr}):*\n\n`;
        todayTasks.forEach((task, idx) => {
            const statusEmoji = task.status === 'completed' ? '✅' : '⏳';
            const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
            reply += `${idx + 1}. [${statusEmoji}] \`[${task.time}]\` *${task.title}* ${priorityEmoji}\n`;
            if (task.desc) reply += `   _(${task.desc})_\n`;
        });
        
        reply += `\n💡 _Dùng câu lệnh \`/done [Số thứ tự]\` để hoàn thành việc. Ví dụ: \`/done 1\`_`;
        await sendMessage(chatId, reply);
        return;
    }

    // Command: /add [tên công việc] [HH:MM]
    if (text.startsWith('/add')) {
        const args = text.replace(/^\/add\s+/, '').trim();
        
        // Regex to match HH:MM at the end of the text
        const timeRegex = /\s([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        const match = args.match(timeRegex);

        if (!match) {
            await sendMessage(chatId, `❌ Sai cú pháp! Vui lòng nhập đúng định dạng:\n\`/add [Tên công việc] [HH:MM]\`\n\nVí dụ: \`/add Tập thể dục 17:30\``);
            return;
        }

        const time = `${match[1].padStart(2, '0')}:${match[2]}`;
        const title = args.replace(timeRegex, '').trim();
        const todayStr = getTodayDateString();

        if (!title) {
            await sendMessage(chatId, `❌ Tên công việc không được để trống!`);
            return;
        }

        const newId = 'task-' + Date.now();
        const newTask = {
            id: newId,
            title: title,
            desc: `Thêm từ Telegram Bot (Chat ID: ${chatId})`,
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
            await sendMessage(chatId, `✅ Đã thêm nhắc nhở thành công!\n📌 *Việc cần làm:* ${title}\n⏰ *Thời gian:* hôm nay lúc \`${time}\``);
        } else {
            await sendMessage(chatId, `❌ Đã xảy ra lỗi khi thêm nhắc nhở vào cơ sở dữ liệu.`);
        }
        return;
    }

    // Command: /done [STT]
    if (text.startsWith('/done')) {
        const arg = text.replace(/^\/done\s+/, '').trim();
        const index = parseInt(arg, 10);

        if (isNaN(index) || index <= 0) {
            await sendMessage(chatId, `❌ Sai cú pháp! Vui lòng nhập đúng số thứ tự của công việc hôm nay:\n\`/done [Số thứ tự]\` (Ví dụ: \`/done 1\`)`);
            return;
        }

        const todayStr = getTodayDateString();
        const tasks = await fetchTasksFromFirestore();
        const todayTasks = tasks.filter(t => t.date === todayStr);
        todayTasks.sort((a, b) => a.time.localeCompare(b.time));

        if (index > todayTasks.length) {
            await sendMessage(chatId, `❌ Số thứ tự không hợp lệ! Hôm nay bạn chỉ có ${todayTasks.length} nhắc nhở.`);
            return;
        }

        const targetTask = todayTasks[index - 1];
        if (targetTask.status === 'completed') {
            await sendMessage(chatId, `💡 Công việc này đã được hoàn thành từ trước rồi!`);
            return;
        }

        targetTask.status = 'completed';
        const success = await saveTaskToFirestore(targetTask);

        if (success) {
            await sendMessage(chatId, `✅ Đã đánh dấu hoàn thành công việc:\n🏆 *"${targetTask.title}"*`);
        } else {
            await sendMessage(chatId, `❌ Lỗi khi cập nhật trạng thái công việc.`);
        }
        return;
    }

    // Unrecognized command
    await sendMessage(chatId, `❓ Lệnh không được nhận dạng. Gửi \`/help\` hoặc \`/start\` để xem các câu lệnh được hỗ trợ.`);
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
            // Keep running even if connection details error or time out
            console.error("⚠️ Lỗi vòng lặp Telegram API:", e.message);
            // Wait 5 seconds before retrying to prevent aggressive spin
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

// Start polling
startPolling();
