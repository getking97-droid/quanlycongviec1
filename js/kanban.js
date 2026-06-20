// ==========================================================================
// KANBAN BOARD VIEW MODULE (DRAG & DROP + MOBILE ARROWS)
// ==========================================================================

const ReminderKanban = {
    tasks: [],
    onStatusChangeCallback: null,
    onEditCallback: null,
    onDeleteCallback: null,

    setTasks(tasksList) {
        this.tasks = tasksList;
    },

    setOnStatusChange(callback) {
        this.onStatusChangeCallback = callback;
    },

    setOnEdit(callback) {
        this.onEditCallback = callback;
    },

    setOnDelete(callback) {
        this.onDeleteCallback = callback;
    },

    // Initialize Kanban drag & drop listeners
    init() {
        const columns = document.querySelectorAll('.kanban-column');
        
        columns.forEach(column => {
            // Drag Over event
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            // Drag Leave event
            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            // Drop event
            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const targetStatus = column.getAttribute('data-status');
                
                if (taskId && targetStatus && this.onStatusChangeCallback) {
                    this.onStatusChangeCallback(taskId, targetStatus);
                }
            });
        });
    },

    // Render cards inside columns
    render() {
        const todoContainer = document.getElementById('kanban-todo-cards');
        const inprogressContainer = document.getElementById('kanban-inprogress-cards');
        const completedContainer = document.getElementById('kanban-completed-cards');

        if (!todoContainer || !inprogressContainer || !completedContainer) return;

        // Clear columns
        todoContainer.innerHTML = '';
        inprogressContainer.innerHTML = '';
        completedContainer.innerHTML = '';

        // Badges count
        let todoCount = 0;
        let inprogressCount = 0;
        let completedCount = 0;

        this.tasks.forEach(task => {
            const card = this.createCardElement(task);

            if (task.status === 'todo') {
                todoContainer.appendChild(card);
                todoCount++;
            } else if (task.status === 'inprogress') {
                inprogressContainer.appendChild(card);
                inprogressCount++;
            } else if (task.status === 'completed') {
                completedContainer.appendChild(card);
                completedCount++;
            }
        });

        // Update badges
        document.getElementById('badge-todo').textContent = todoCount;
        document.getElementById('badge-inprogress').textContent = inprogressCount;
        document.getElementById('badge-completed').textContent = completedCount;
    },

    // Helper to create card HTML DOM element
    createCardElement(task) {
        const card = document.createElement('div');
        card.className = `kanban-card priority-${task.priority}`;
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);

        // Add HTML5 Drag Start listener
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => {
                card.style.opacity = '0.4';
            }, 0);
        });

        // Add HTML5 Drag End listener
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
        });

        // Date Display
        const dateObj = new Date(`${task.date}T${task.time}`);
        const formattedDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + task.time;

        // Arrows for accessibility / mobile
        let arrowControls = '';
        if (task.status === 'todo') {
            arrowControls = `<button class="kanban-btn-move btn-move-right" title="Chuyển sang Đang thực hiện">➡️</button>`;
        } else if (task.status === 'inprogress') {
            arrowControls = `
                <button class="kanban-btn-move btn-move-left" title="Quay lại Chưa thực hiện">⬅️</button>
                <button class="kanban-btn-move btn-move-right" title="Chuyển sang Đã hoàn thành">➡️</button>
            `;
        } else if (task.status === 'completed') {
            arrowControls = `<button class="kanban-btn-move btn-move-left" title="Quay lại Đang thực hiện">⬅️</button>`;
        }

        card.innerHTML = `
            <div class="kanban-card-header">
                <span class="kanban-card-tag">${task.category || 'Chung'}</span>
                <span class="priority-pill ${task.priority}">${task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}</span>
            </div>
            <h4 class="kanban-card-title">${task.title}</h4>
            <p class="kanban-card-desc">${task.desc || 'Không có ghi chú'}</p>
            <div class="kanban-card-footer">
                <div class="kanban-card-time">
                    <span>📅</span>
                    <span>${formattedDate}</span>
                </div>
                <div class="kanban-card-actions">
                    ${arrowControls}
                    <button class="kanban-btn-move btn-edit" title="Sửa">✏️</button>
                    <button class="kanban-btn-move btn-delete" title="Xóa">🗑️</button>
                </div>
            </div>
        `;

        // Attach listeners for inner action buttons
        const btnLeft = card.querySelector('.btn-move-left');
        const btnRight = card.querySelector('.btn-move-right');
        const btnEdit = card.querySelector('.btn-edit');
        const btnDelete = card.querySelector('.btn-delete');

        if (btnLeft) {
            btnLeft.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetStatus = task.status === 'completed' ? 'inprogress' : 'todo';
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(task.id, targetStatus);
            });
        }

        if (btnRight) {
            btnRight.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetStatus = task.status === 'todo' ? 'inprogress' : 'completed';
                if (this.onStatusChangeCallback) this.onStatusChangeCallback(task.id, targetStatus);
            });
        }

        if (btnEdit) {
            btnEdit.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onEditCallback) this.onEditCallback(task);
            });
        }

        if (btnDelete) {
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onDeleteCallback) this.onDeleteCallback(task.id);
            });
        }

        return card;
    }
};
