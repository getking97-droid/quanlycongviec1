// ==========================================================================
// CALENDAR VIEW MODULE
// ==========================================================================

const ReminderCalendar = {
    currentDate: new Date(),
    tasks: [],
    onDayClickCallback: null,

    // Set tasks to display on the calendar
    setTasks(tasksList) {
        this.tasks = tasksList;
    },

    // Set listener for cell click
    setOnDayClick(callback) {
        this.onDayClickCallback = callback;
    },

    // Navigate to previous month
    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    },

    // Navigate to next month
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    },

    // Main calendar rendering function
    render() {
        const grid = document.getElementById('calendar-days-grid');
        const monthYearLabel = document.getElementById('calendar-month-year');
        if (!grid || !monthYearLabel) return;

        grid.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Month Names in Vietnamese
        const monthNames = [
            "Tháng 01", "Tháng 02", "Tháng 03", "Tháng 04",
            "Tháng 05", "Tháng 06", "Tháng 07", "Tháng 08",
            "Tháng 09", "Tháng 10", "Tháng 11", "Tháng 12"
        ];
        
        monthYearLabel.textContent = `${monthNames[month]}, ${year}`;

        // Get first day of the month and total number of days
        const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0, Monday is 1...
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        const today = new Date();

        // 1. Draw last month's trailing days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthTotalDays - i;
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell inactive';
            cell.innerHTML = `<span class="day-number">${dayNum}</span>`;
            grid.appendChild(cell);
        }

        // 2. Draw current month's days
        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';
            
            // Format date string as YYYY-MM-DD in local time
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateString = `${year}-${monthStr}-${dayStr}`;

            // Check if today
            if (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year) {
                cell.classList.add('today');
            }

            cell.innerHTML = `<span class="day-number">${day}</span>`;

            // Draw tasks for this day
            const tasksListContainer = document.createElement('div');
            tasksListContainer.className = 'calendar-day-tasks';
            
            const dayTasks = this.tasks.filter(t => t.date === dateString);
            dayTasks.forEach(task => {
                const taskBadge = document.createElement('div');
                taskBadge.className = `calendar-task-item ${task.priority}`;
                taskBadge.textContent = `${task.time} ${task.title}`;
                taskBadge.title = `${task.time} - ${task.title}`;
                tasksListContainer.appendChild(taskBadge);
            });

            cell.appendChild(tasksListContainer);

            // Add Click listener to create a task on this date
            cell.addEventListener('click', () => {
                if (this.onDayClickCallback) {
                    this.onDayClickCallback(dateString);
                }
            });

            grid.appendChild(cell);
        }

        // 3. Draw next month's leading days to make a complete grid (up to 42 cells)
        const totalRendered = firstDayIndex + totalDays;
        const remainingCells = 42 - totalRendered;
        
        for (let day = 1; day <= remainingCells; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell inactive';
            cell.innerHTML = `<span class="day-number">${day}</span>`;
            grid.appendChild(cell);
        }
    }
};
