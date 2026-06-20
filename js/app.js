// ==========================================================================
// CORE APP ENGINE (STATE, ROUTING, RENDERING & SYSTEM GLUE)
// ==========================================================================

const ReminderApp = {
    tasks: [],
    currentTheme: 'dark',
    currentView: 'dashboard',
    
    // Initializer
    init() {
        this.loadState();
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.initSubModules();
        this.updateClock();
        this.renderAll();
        
        // Notification alarm check loop
        ReminderNotifications.initChecker(() => this.checkOverdueTasks());
        
        // Start running digital clock
        setInterval(() => this.updateClock(), 1000);
    },

    // Load from LocalStorage
    loadState() {
        try {
            const savedTasks = localStorage.getItem('reminder_tasks');
            this.tasks = savedTasks ? JSON.parse(savedTasks) : this.getMockTasks();
            
            this.currentTheme = localStorage.getItem('reminder_theme') || 'dark';
            ReminderNotifications.soundType = localStorage.getItem('reminder_sound') || 'bell';
            
            // Set alarm sound dropdown state
            const soundSelect = document.getElementById('setting-sound-type');
            if (soundSelect) soundSelect.value = ReminderNotifications.soundType;
        } catch (e) {
            console.error("Lỗi khi tải dữ liệu từ localStorage:", e);
            this.tasks = this.getMockTasks();
        }
    },

    // Save to LocalStorage
    saveState() {
        try {
            localStorage.setItem('reminder_tasks', JSON.stringify(this.tasks));
            localStorage.setItem('reminder_theme', this.currentTheme);
            localStorage.setItem('reminder_sound', ReminderNotifications.soundType);
        } catch (e) {
            console.error("Lỗi khi lưu dữ liệu vào localStorage:", e);
        }
    },

    // Prepopulate some default tasks if storage is empty
    getMockTasks() {
        const today = new Date();
        const getOffsetDate = (days, hoursOffset = 0, minsOffset = 0) => {
            const d = new Date(today);
            d.setDate(today.getDate() + days);
            d.setHours(today.getHours() + hoursOffset);
            d.setMinutes(today.getMinutes() + minsOffset);
            
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
        };

        const t1 = getOffsetDate(0, 0, 5); // due in 5 mins
        const t2 = getOffsetDate(0, 2); // due in 2 hours
        const t3 = getOffsetDate(1, -1); // due tomorrow
        const t4 = getOffsetDate(-1, 0); // yesterday (completed)

        return [
            {
                id: 'mock-1',
                title: 'Uống thuốc bổ mắt',
                desc: 'Uống sau khi ăn trưa, 1 viên màu vàng.',
                date: t1.date,
                time: t1.time,
                priority: 'medium',
                category: 'Sức khỏe',
                recurrence: 'daily',
                status: 'todo',
                alarmed: false
            },
            {
                id: 'mock-2',
                title: 'Họp tiến độ dự án',
                desc: 'Báo cáo phần giao diện nhắc việc cho khách hàng.',
                date: t2.date,
                time: t2.time,
                priority: 'high',
                category: 'Công việc',
                recurrence: 'none',
                status: 'todo',
                alarmed: false
            },
            {
                id: 'mock-3',
                title: 'Ôn tập từ vựng tiếng Anh',
                desc: 'Học 10 từ mới chủ đề công nghệ thông tin.',
                date: t3.date,
                time: t3.time,
                priority: 'low',
                category: 'Học tập',
                recurrence: 'none',
                status: 'todo',
                alarmed: false
            },
            {
                id: 'mock-4',
                title: 'Chạy bộ thể dục buổi tối',
                desc: 'Chạy quanh công viên 5km.',
                date: t4.date,
                time: t4.time,
                priority: 'low',
                category: 'Sức khỏe',
                recurrence: 'daily',
                status: 'completed',
                alarmed: true
            }
        ];
    },

    // Apply selected theme class
    applyTheme(theme) {
        document.body.className = '';
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else if (theme === 'cyber') {
            document.body.classList.add('cyber-theme');
        } else {
            document.body.classList.add('dark-theme');
        }
        
        // Update setting buttons active classes
        document.querySelectorAll('.theme-btn').forEach(btn => {
            if (btn.getAttribute('data-theme') === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    // Link modules callbacks
    initSubModules() {
        // Connect Calendar
        ReminderCalendar.setTasks(this.tasks);
        ReminderCalendar.setOnDayClick((dateStr) => {
            this.openTaskModal(null, dateStr);
        });

        // Connect Kanban
        ReminderKanban.setTasks(this.tasks);
        ReminderKanban.setOnStatusChange((id, status) => {
            this.updateTaskStatus(id, status);
        });
        ReminderKanban.setOnEdit((task) => {
            this.openTaskModal(task);
        });
        ReminderKanban.setOnDelete((id) => {
            this.deleteTask(id);
        });
        ReminderKanban.init();
    },

    // Set UI event bindings
    setupEventListeners() {
        // Sidebar tab switching
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetView = item.getAttribute('data-view');
                this.switchView(targetView);
            });
        });

        // Dashboard Today "Xem tất cả" redirect
        const viewAllToday = document.getElementById('link-view-all-today');
        if (viewAllToday) {
            viewAllToday.addEventListener('click', (e) => {
                e.preventDefault();
                // Filter status to "todo" and day to today
                document.getElementById('filter-status').value = 'todo';
                this.switchView('tasks');
            });
        }

        // Add task buttons (header and calendar cell)
        const btnHeaderAdd = document.getElementById('btn-add-task-header');
        if (btnHeaderAdd) {
            btnHeaderAdd.addEventListener('click', () => this.openTaskModal());
        }

        // Search Input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.renderTasksList());
        }

        // Filters dropdown listeners
        ['filter-status', 'filter-priority', 'filter-category'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', () => this.renderTasksList());
            }
        });

        // Modal triggers
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('btn-cancel-task').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('task-form').addEventListener('submit', (e) => this.handleTaskSave(e));

        // Quick add form
        document.getElementById('quick-add-form').addEventListener('submit', (e) => this.handleQuickAdd(e));

        // Calendar Month switching
        document.getElementById('btn-cal-prev').addEventListener('click', () => ReminderCalendar.prevMonth());
        document.getElementById('btn-cal-next').addEventListener('click', () => ReminderCalendar.nextMonth());

        // Settings view triggers
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.getAttribute('data-theme');
                this.currentTheme = theme;
                this.applyTheme(theme);
                this.saveState();
            });
        });

        // Sound tone selector
        const soundSelect = document.getElementById('setting-sound-type');
        if (soundSelect) {
            soundSelect.addEventListener('change', (e) => {
                ReminderNotifications.soundType = e.target.value;
                this.saveState();
            });
        }

        // Test Sound Button
        document.getElementById('btn-test-sound').addEventListener('click', () => {
            ReminderNotifications.testSound();
        });

        // Request Push Notification Permissions
        document.getElementById('btn-request-permission').addEventListener('click', () => {
            ReminderNotifications.requestPermission();
        });

        // Alarm overlay actions
        document.getElementById('btn-alarm-dismiss').addEventListener('click', () => this.handleAlarmDismiss());
        document.getElementById('btn-alarm-snooze').addEventListener('click', () => this.handleAlarmSnooze());

        // Danger zone clear data
        document.getElementById('btn-clear-data').addEventListener('click', () => {
            if (confirm("CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tất cả nhắc nhở của bạn. Bạn có muốn tiếp tục?")) {
                localStorage.clear();
                this.tasks = [];
                this.saveState();
                this.initSubModules();
                this.renderAll();
                alert("Dữ liệu đã được xóa hoàn tất.");
            }
        });
    },

    // Clock display update
    updateClock() {
        const clock = document.getElementById('current-time-clock');
        if (clock) {
            const now = new Date();
            clock.textContent = now.toLocaleTimeString('vi-VN', { hour12: false });
        }
    },

    // Active tab routing
    switchView(viewName) {
        this.currentView = viewName;
        
        // Hide all views, display the selected one
        document.querySelectorAll('.app-view').forEach(view => {
            if (view.id === `view-${viewName}`) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });

        // Update sidebar items
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Trigger specific view rendering routines
        if (viewName === 'calendar') {
            ReminderCalendar.render();
        } else if (viewName === 'kanban') {
            ReminderKanban.render();
        } else if (viewName === 'tasks') {
            this.renderTasksList();
        } else if (viewName === 'dashboard') {
            this.renderDashboard();
        }
    },

    // Main render router
    renderAll() {
        this.renderCategoryOptions();
        this.renderDashboard();
        this.renderTasksList();
        ReminderCalendar.render();
        ReminderKanban.render();
        this.updateSidebarProgress();
    },

    // Dashboard analytics calculations
    renderDashboard() {
        const todayStr = this.getTodayDateString();
        
        const urgentTasks = this.tasks.filter(t => t.priority === 'high' && t.status !== 'completed');
        const todayTasks = this.tasks.filter(t => t.date === todayStr);
        const completedTasks = this.tasks.filter(t => t.status === 'completed');
        
        const totalTasks = this.tasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

        // Set counts
        document.getElementById('stat-urgent-count').textContent = urgentTasks.length;
        document.getElementById('stat-today-count').textContent = todayTasks.length;
        document.getElementById('stat-done-count').textContent = completedTasks.length;
        document.getElementById('stat-completion-rate').textContent = `${completionRate}%`;

        // Render today's notifications lists
        const container = document.getElementById('today-reminders-container');
        if (container) {
            container.innerHTML = '';
            
            // Sort by time ascending
            const sortedTodayTasks = [...todayTasks].sort((a, b) => a.time.localeCompare(b.time));
            
            if (sortedTodayTasks.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>Không có nhắc nhở nào trong hôm nay!</p>
                    </div>
                `;
            } else {
                sortedTodayTasks.forEach(task => {
                    const row = document.createElement('div');
                    row.className = `reminder-row-item ${task.status === 'completed' ? 'completed' : ''}`;
                    
                    row.innerHTML = `
                        <div class="reminder-row-left">
                            <div class="checkbox-custom ${task.status === 'completed' ? 'checked' : ''}" data-id="${task.id}"></div>
                            <div class="reminder-row-details">
                                <span class="reminder-row-title">${task.title}</span>
                                <span class="reminder-row-meta">
                                    <span>📂 ${task.category || 'Chung'}</span>
                                    <span>⏰ ${task.time}</span>
                                    ${task.recurrence !== 'none' ? `<span>🔄 ${task.recurrence === 'daily' ? 'Hàng ngày' : task.recurrence === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}</span>` : ''}
                                </span>
                            </div>
                        </div>
                        <div class="reminder-row-right">
                            <span class="priority-pill ${task.priority}">${task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'T.Bình' : 'Thấp'}</span>
                        </div>
                    `;

                    // Checkbox completion toggle click handler
                    row.querySelector('.checkbox-custom').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
                        this.updateTaskStatus(task.id, nextStatus);
                    });

                    container.appendChild(row);
                });
            }
        }

        // Render category charts
        this.renderCategoryCharts();
        
        // Update welcome banner hour message
        const welcomeTitle = document.getElementById('welcome-title');
        if (welcomeTitle) {
            const hr = new Date().getHours();
            let greeting = 'Chào bạn!';
            if (hr < 12) greeting = 'Chào buổi sáng! 🌅';
            else if (hr < 18) greeting = 'Chào buổi chiều! ☀️';
            else greeting = 'Chào buổi tối! 🌙';
            welcomeTitle.textContent = greeting;
        }
    },

    // Category progress bars chart
    renderCategoryCharts() {
        const container = document.getElementById('category-bars-container');
        if (!container) return;

        container.innerHTML = '';

        // Extract unique categories
        const categoriesMap = {};
        this.tasks.forEach(task => {
            const cat = task.category || 'Chung';
            if (!categoriesMap[cat]) {
                categoriesMap[cat] = { total: 0, completed: 0 };
            }
            categoriesMap[cat].total++;
            if (task.status === 'completed') {
                categoriesMap[cat].completed++;
            }
        });

        const categories = Object.keys(categoriesMap);
        if (categories.length === 0) {
            container.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">Chưa có thống kê nào.</p>`;
            return;
        }

        categories.forEach(cat => {
            const stats = categoriesMap[cat];
            const percent = Math.round((stats.completed / stats.total) * 100);
            
            const wrapper = document.createElement('div');
            wrapper.className = 'category-bar-wrapper';
            wrapper.innerHTML = `
                <div class="category-bar-header">
                    <span>${cat}</span>
                    <span>${stats.completed}/${stats.total} (${percent}%)</span>
                </div>
                <div class="category-bar-bg">
                    <div class="category-bar-fill" style="width: ${percent}%;"></div>
                </div>
            `;
            container.appendChild(wrapper);
        });
    },

    // Sidebar circular ring progress
    updateSidebarProgress() {
        const circle = document.getElementById('progress-circle');
        const text = document.getElementById('progress-text');
        if (!circle || !text) return;

        const todayStr = this.getTodayDateString();
        const todayTasks = this.tasks.filter(t => t.date === todayStr);
        const todayCompleted = todayTasks.filter(t => t.status === 'completed');

        const totalToday = todayTasks.length;
        const percent = totalToday > 0 ? Math.round((todayCompleted.length / totalToday) * 100) : 0;

        // SVG circle radius = 32. Circumference = 2 * PI * r = 201.06
        const circumference = 2 * Math.PI * 32;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        text.textContent = `${percent}%`;
    },

    // Filters and search for Task List view
    renderTasksList() {
        const tbody = document.getElementById('tasks-table-body');
        const emptyState = document.getElementById('tasks-empty-state');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Read query filter states
        const searchVal = document.getElementById('search-input').value.toLowerCase();
        const statusFilter = document.getElementById('filter-status').value;
        const priorityFilter = document.getElementById('filter-priority').value;
        const categoryFilter = document.getElementById('filter-category').value;

        // Filter calculation
        const filteredTasks = this.tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchVal) || 
                                  (task.desc && task.desc.toLowerCase().includes(searchVal));
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;

            return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
        });

        // Sorting: status incomplete first, then date, then time ascending
        filteredTasks.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            
            return a.time.localeCompare(b.time);
        });

        if (filteredTasks.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            filteredTasks.forEach(task => {
                const tr = document.createElement('tr');
                tr.className = task.status === 'completed' ? 'completed' : '';
                
                const dateObj = new Date(`${task.date}T${task.time}`);
                const formattedTime = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' - ' + task.time;
                
                const priorityLabels = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

                tr.innerHTML = `
                    <td>
                        <div class="checkbox-custom ${task.status === 'completed' ? 'checked' : ''}" data-id="${task.id}"></div>
                    </td>
                    <td>
                        <div class="task-cell-title">
                            <h4>${task.title}</h4>
                            <p>${task.desc || 'Không có mô tả'}</p>
                        </div>
                    </td>
                    <td class="task-cell-time">${formattedTime}</td>
                    <td>
                        <span class="priority-pill ${task.priority}">${priorityLabels[task.priority]}</span>
                    </td>
                    <td>
                        <span class="badge badge-success">${task.category || 'Chung'}</span>
                    </td>
                    <td>
                        <div class="btn-actions">
                            <button class="btn-sm-icon btn-edit-action" title="Chỉnh sửa">✏️</button>
                            <button class="btn-sm-icon btn-delete-action" title="Xóa">🗑️</button>
                        </div>
                    </td>
                `;

                // Bind checkbox check click
                tr.querySelector('.checkbox-custom').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
                    this.updateTaskStatus(task.id, nextStatus);
                });

                // Bind Edit action click
                tr.querySelector('.btn-edit-action').addEventListener('click', () => {
                    this.openTaskModal(task);
                });

                // Bind Delete action click
                tr.querySelector('.btn-delete-action').addEventListener('click', () => {
                    this.deleteTask(task.id);
                });

                tbody.appendChild(tr);
            });
        }
    },

    // Build unique categories for the filters dropdown list
    renderCategoryOptions() {
        const filterSelect = document.getElementById('filter-category');
        if (!filterSelect) return;

        // Preserve current selection if any
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">Tất cả</option>';

        // Extract unique categories
        const uniqueCategories = new Set();
        this.tasks.forEach(t => {
            if (t.category) uniqueCategories.add(t.category);
        });

        uniqueCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterSelect.appendChild(option);
        });

        // Restore value
        if (uniqueCategories.has(currentVal)) {
            filterSelect.value = currentVal;
        }
    },

    // Trigger state changes on status change
    updateTaskStatus(id, newStatus) {
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                // If moving from completed back to todo/inprogress, allow alarm to fire again
                const wasCompleted = task.status === 'completed';
                const isStatusReversed = newStatus !== 'completed' && wasCompleted;
                return { 
                    ...task, 
                    status: newStatus, 
                    alarmed: isStatusReversed ? false : task.alarmed 
                };
            }
            return task;
        });

        this.saveState();
        this.initSubModules();
        this.renderAll();
    },

    // Delete task handler
    deleteTask(id) {
        if (confirm("Bạn có chắc chắn muốn xóa nhắc nhở này?")) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveState();
            this.initSubModules();
            this.renderAll();
        }
    },

    // Open Task details / CRUD modal
    openTaskModal(task = null, defaultDate = null) {
        const modal = document.getElementById('task-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('task-form');
        
        if (!modal || !form || !modalTitle) return;

        // Reset form
        form.reset();
        document.getElementById('task-id').value = '';

        if (task) {
            // Edit Mode
            modalTitle.textContent = "Chỉnh Sửa Nhắc Việc";
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-desc').value = task.desc || '';
            document.getElementById('task-date').value = task.date;
            document.getElementById('task-time').value = task.time;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-category').value = task.category || 'Công việc';
            document.getElementById('task-recurrence').value = task.recurrence || 'none';
        } else {
            // Create Mode
            modalTitle.textContent = "Thêm Nhắc Việc Mới";
            // Pre-fill date
            const todayStr = this.getTodayDateString();
            document.getElementById('task-date').value = defaultDate || todayStr;
            
            // Pre-fill time to next hour round off
            const now = new Date();
            const hour = String((now.getHours() + 1) % 24).padStart(2, '0');
            document.getElementById('task-time').value = `${hour}:00`;
            document.getElementById('task-recurrence').value = 'none';
        }

        modal.classList.remove('hidden');
        modal.classList.add('active');
    },

    // Close Modal trigger
    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.classList.add('hidden');
        }
    },

    // Handle Form Submit (save/edit)
    handleTaskSave(e) {
        e.preventDefault();

        const id = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value;
        const desc = document.getElementById('task-desc').value;
        const date = document.getElementById('task-date').value;
        const time = document.getElementById('task-time').value;
        const priority = document.getElementById('task-priority').value;
        const category = document.getElementById('task-category').value;
        const recurrence = document.getElementById('task-recurrence').value;

        if (id) {
            // Edit existing
            this.tasks = this.tasks.map(t => {
                if (t.id === id) {
                    // Reset alarmed flag if time or date changed
                    const timeChanged = t.date !== date || t.time !== time;
                    return {
                        ...t,
                        title,
                        desc,
                        date,
                        time,
                        priority,
                        category,
                        recurrence,
                        alarmed: timeChanged ? false : t.alarmed
                    };
                }
                return t;
            });
        } else {
            // Create new
            const newTask = {
                id: 'task-' + Date.now(),
                title,
                desc,
                date,
                time,
                priority,
                category,
                recurrence,
                status: 'todo',
                alarmed: false
            };
            this.tasks.push(newTask);
        }

        this.saveState();
        this.closeTaskModal();
        this.initSubModules();
        this.renderAll();
    },

    // Handle Dashboard Quick Add Submit
    handleQuickAdd(e) {
        e.preventDefault();

        const titleInput = document.getElementById('quick-task-title');
        const timeInput = document.getElementById('quick-task-time');
        const priorityInput = document.getElementById('quick-task-priority');

        if (!titleInput || !timeInput || !priorityInput) return;

        const newTask = {
            id: 'task-' + Date.now(),
            title: titleInput.value,
            desc: '',
            date: this.getTodayDateString(),
            time: timeInput.value,
            priority: priorityInput.value,
            category: 'Công việc',
            recurrence: 'none',
            status: 'todo',
            alarmed: false
        };

        this.tasks.push(newTask);
        this.saveState();
        
        // Reset quick form inputs
        titleInput.value = '';
        
        this.initSubModules();
        this.renderAll();
    },

    // Poller matching criteria to trigger active alarms
    checkOverdueTasks() {
        if (ReminderNotifications.activeAlarmTask) return; // Wait if an alarm overlay is currently visible

        const now = new Date();
        const currentDateStr = this.getTodayDateString();
        const currentTimeStr = now.toTimeString().substring(0, 5); // "HH:MM"

        // Search for task where due <= now, status not completed, and alarmed is false
        const overdueTask = this.tasks.find(task => {
            if (task.status === 'completed' || task.alarmed) return false;

            const dueDateTime = new Date(`${task.date}T${task.time}`);
            return dueDateTime <= now;
        });

        if (overdueTask) {
            ReminderNotifications.triggerAlarm(overdueTask);
        }
    },

    // Dismiss active alarm
    handleAlarmDismiss() {
        const task = ReminderNotifications.activeAlarmTask;
        if (!task) return;

        ReminderNotifications.stopAlarm();

        if (task.recurrence !== 'none') {
            // Update date to next interval
            const updatedTasks = this.tasks.map(t => {
                if (t.id === task.id) {
                    const nextDate = this.calculateNextRecurrenceDate(t.date, t.recurrence);
                    return {
                        ...t,
                        date: nextDate,
                        alarmed: false, // Reset alarm flag for next interval
                        status: 'todo'  // Reset status to uncompleted
                    };
                }
                return t;
            });
            this.tasks = updatedTasks;
        } else {
            // Mark single alarm as completed
            const updatedTasks = this.tasks.map(t => {
                if (t.id === task.id) {
                    return {
                        ...t,
                        status: 'completed',
                        alarmed: true
                    };
                }
                return t;
            });
            this.tasks = updatedTasks;
        }

        this.saveState();
        this.initSubModules();
        this.renderAll();
    },

    // Snooze active alarm (delays it by 5 minutes)
    handleAlarmSnooze() {
        const task = ReminderNotifications.activeAlarmTask;
        if (!task) return;

        ReminderNotifications.stopAlarm();

        const now = new Date();
        now.setMinutes(now.getMinutes() + 5); // Add 5 minutes

        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');

        const nextDateStr = `${yyyy}-${mm}-${dd}`;
        const nextTimeStr = `${hh}:${min}`;

        this.tasks = this.tasks.map(t => {
            if (t.id === task.id) {
                return {
                    ...t,
                    date: nextDateStr,
                    time: nextTimeStr,
                    alarmed: false // Reset alarm flag to fire again
                };
            }
            return t;
        });

        this.saveState();
        this.initSubModules();
        this.renderAll();
    },

    // Calculation helper for recurring tasks
    calculateNextRecurrenceDate(currentDateStr, recurrence) {
        const date = new Date(currentDateStr);
        if (recurrence === 'daily') {
            date.setDate(date.getDate() + 1);
        } else if (recurrence === 'weekly') {
            date.setDate(date.getDate() + 7);
        } else if (recurrence === 'monthly') {
            date.setMonth(date.getMonth() + 1);
        }
        
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    // Helper: Local string YYYY-MM-DD
    getTodayDateString() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
};

// Global Page Loader Init
window.addEventListener('DOMContentLoaded', () => {
    ReminderApp.init();
});
