// ==========================================================================
// NOTIFICATION & ALARM SOUND ENGINE (WEB AUDIO & PUSH API)
// ==========================================================================

const ReminderNotifications = {
    audioCtx: null,
    alarmInterval: null,
    alarmSoundActive: false,
    activeAlarmTask: null,
    soundType: 'bell', // default sound

    // Lazy load Audio Context
    getAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    // Synthesize Bell sound (Soft chime)
    playBell(ctx, time) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, time); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1200, time + 0.1);
        
        gainNode.gain.setValueAtTime(0.5, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
        
        osc.start(time);
        osc.stop(time + 1.6);
    },

    // Synthesize Digital Alert sound (Beep beep)
    playDigital(ctx, time) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, time); // B5 note
        
        gainNode.gain.setValueAtTime(0.2, time);
        gainNode.gain.setValueAtTime(0.001, time + 0.1);
        gainNode.gain.setValueAtTime(0.2, time + 0.2);
        gainNode.gain.setValueAtTime(0.001, time + 0.3);
        
        osc.start(time);
        osc.stop(time + 0.4);
    },

    // Synthesize Siren Sound (Warble alarm)
    playSiren(ctx, time) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, time);
        osc.frequency.linearRampToValueAtTime(900, time + 0.25);
        osc.frequency.linearRampToValueAtTime(600, time + 0.5);
        
        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        
        osc.start(time);
        osc.stop(time + 0.5);
    },

    // Main sound trigger
    playAlarmSound() {
        if (!this.alarmSoundActive) return;
        
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;
            
            if (this.soundType === 'bell') {
                this.playBell(ctx, now);
                // Repeat every 2 seconds
                setTimeout(() => this.playAlarmSound(), 2000);
            } else if (this.soundType === 'digital') {
                this.playDigital(ctx, now);
                // Repeat every 1 second
                setTimeout(() => this.playAlarmSound(), 1000);
            } else if (this.soundType === 'siren') {
                this.playSiren(ctx, now);
                // Repeat every 0.6 seconds
                setTimeout(() => this.playAlarmSound(), 600);
            }
        } catch (e) {
            console.error("Lỗi âm thanh Web Audio API:", e);
        }
    },

    // Start active screen alarm
    triggerAlarm(task) {
        if (this.activeAlarmTask) return; // Only alarm one at a time
        
        this.activeAlarmTask = task;
        this.alarmSoundActive = true;
        
        // Try displaying HTML5 push notification
        this.showPushNotification(task);

        // Send alert to Telegram if Chat ID is configured
        const tgChatId = localStorage.getItem('telegram_chat_id');
        if (tgChatId) {
            const botToken = "8837753488:AAF2I8nWU9zBMR1813mcgEuxqKSWvCuvtEM";
            const text = `⏰ *NHẮC NHỞ CÔNG VIỆC:*\n\n📌 *Tiêu đề:* ${task.title}\n📝 *Mô tả:* ${task.desc || "Không có chi tiết"}\n📅 *Thời gian:* ${task.date} lúc \`${task.time}\`\n🚨 *Mức độ:* ${task.priority === 'high' ? 'Cao 🔴' : task.priority === 'medium' ? 'Trung bình 🟡' : 'Thấp 🟢'}`;
            
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: tgChatId, text: text, parse_mode: 'Markdown' })
            }).catch(e => console.error("Lỗi gửi tin nhắn Telegram:", e));
        }
        
        // Show Alarm Overlay UI
        const overlay = document.getElementById('alarm-overlay');
        const title = document.getElementById('alarm-title');
        const desc = document.getElementById('alarm-desc');
        const timeDisplay = document.getElementById('alarm-time-display');
        
        if (overlay && title && desc && timeDisplay) {
            title.textContent = task.title;
            desc.textContent = task.desc || "Không có mô tả chi tiết";
            
            const taskTime = new Date(`${task.date}T${task.time}`);
            timeDisplay.textContent = taskTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
        }
        
        // Play sound synthesis loops
        this.playAlarmSound();
    },

    // Stop active screen alarm
    stopAlarm() {
        this.alarmSoundActive = false;
        this.activeAlarmTask = null;
        
        const overlay = document.getElementById('alarm-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
        }
    },

    // HTML5 Push Notification Permission Request
    requestPermission() {
        if (!("Notification" in window)) {
            alert("Trình duyệt này không hỗ trợ thông báo đẩy.");
            return;
        }
        
        Notification.requestPermission().then(permission => {
            this.updatePermissionBadge(permission);
        });
    },

    // Update permission status UI
    updatePermissionBadge(permission) {
        const badge = document.getElementById('notification-status-badge');
        if (!badge) return;
        
        if (permission === 'granted') {
            badge.textContent = "Đã cấp quyền";
            badge.className = "badge badge-success";
        } else if (permission === 'denied') {
            badge.textContent = "Đã từ chối";
            badge.className = "badge badge-danger";
        } else {
            badge.textContent = "Chưa cấp quyền";
            badge.className = "badge badge-warning";
        }
    },

    // Show HTML5 Notification
    showPushNotification(task) {
        if (!("Notification" in window) || Notification.permission !== 'granted') return;
        
        const options = {
            body: task.desc || "Đến giờ thực hiện công việc!",
            icon: 'favicon.ico', // fallback
            requireInteraction: true,
            tag: task.id
        };
        
        const n = new Notification(`⏰ Nhắc việc: ${task.title}`, options);
        n.onclick = () => {
            window.focus();
            n.close();
        };
    },

    // Test synthesized alarm sound in settings
    testSound() {
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;
            
            if (this.soundType === 'bell') {
                this.playBell(ctx, now);
            } else if (this.soundType === 'digital') {
                this.playDigital(ctx, now);
            } else if (this.soundType === 'siren') {
                this.playSiren(ctx, now);
            }
        } catch (e) {
            console.error("Không thể phát thử âm thanh:", e);
        }
    },

    // Setup polling check loop
    initChecker(checkCallback) {
        // Run check loop every 10 seconds
        if (this.alarmInterval) clearInterval(this.alarmInterval);
        this.alarmInterval = setInterval(checkCallback, 10000);
        
        // Initial badge update
        if ("Notification" in window) {
            this.updatePermissionBadge(Notification.permission);
        }
    }
};
