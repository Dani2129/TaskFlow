// ==========================================
// TASKFLOW - MAIN JAVASCRIPT
// ==========================================

// ---------- DOM ELEMENTS ----------
// We grab references to HTML elements we'll manipulate
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const themeToggle = document.getElementById('themeToggle');
const filterBtns = document.querySelectorAll('.filter-btn');
const totalTasksSpan = document.getElementById('totalTasks');
const pendingTasksSpan = document.getElementById('pendingTasks');
const completedTasksSpan = document.getElementById('completedTasks');

// ---------- STATE ----------
// This array holds all our tasks
// Each task is an object: { id, text, completed, createdAt }
let tasks = [];

// Current filter: 'all', 'pending', or 'completed'
let currentFilter = 'all';

// ---------- LOCAL STORAGE ----------
// Load tasks from browser storage when page loads
function loadTasks() {
    const storedTasks = localStorage.getItem('taskflow-tasks');
    if (storedTasks) {
        // JSON.parse converts string back to JavaScript array
        tasks = JSON.parse(storedTasks);
    } else {
        tasks = []; // Start empty if nothing stored
    }
}

// Save tasks to browser storage
function saveTasks() {
    // JSON.stringify converts array to string for storage
    localStorage.setItem('taskflow-tasks', JSON.stringify(tasks));
}

// ---------- THEME ----------
// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('taskflow-theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Toggle dark/light mode
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        // Switch to light
        document.documentElement.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('taskflow-theme', 'light');
    } else {
        // Switch to dark
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('taskflow-theme', 'dark');
    }
});

// ---------- HELPER FUNCTIONS ----------
// Generate unique ID for each task
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    // Hide error after 3 seconds
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 3000);
}

// Format date to readable string
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// ---------- RENDER FUNCTION ----------
// This is the MOST IMPORTANT function - it draws the task list on screen
function renderTasks() {
    // Clear the current list
    taskList.innerHTML = '';

    // Filter tasks based on current filter
    let filteredTasks = tasks;
    if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }

    // If no tasks after filtering, show empty state
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        if (currentFilter === 'completed') {
            emptyState.querySelector('h3').textContent = 'No completed tasks';
            emptyState.querySelector('p').textContent = 'Complete some tasks to see them here!';
        } else if (currentFilter === 'pending') {
            emptyState.querySelector('h3').textContent = 'No pending tasks';
            emptyState.querySelector('p').textContent = 'You\'re all caught up! 🎉';
        } else {
            emptyState.querySelector('h3').textContent = 'No tasks yet!';
            emptyState.querySelector('p').textContent = 'Add your first task above and start being productive 🚀';
        }
    } else {
        emptyState.classList.add('hidden');

        // Create and append each task item
        filteredTasks.forEach(task => {
            // Create <li> element
            const li = document.createElement('li');
            li.className = 'task-item';
            li.setAttribute('data-id', task.id);

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTask(task.id));

            // Task text
            const span = document.createElement('span');
            span.className = 'task-text';
            if (task.completed) span.classList.add('completed');
            span.textContent = task.text;

            // Timestamp
            const time = document.createElement('span');
            time.className = 'task-time';
            time.textContent = formatDate(task.createdAt);

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit task';
            editBtn.addEventListener('click', () => editTask(task.id));

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete task';
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            // Assemble the task item
            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(time);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);

            // Add to the list
            taskList.appendChild(li);
        });
    }

    // Update stats
    updateStats();
}

// ---------- UPDATE STATS ----------
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    totalTasksSpan.textContent = total;
    completedTasksSpan.textContent = completed;
    pendingTasksSpan.textContent = pending;
}

// ---------- CRUD OPERATIONS ----------
// CREATE - Add a new task
function addTask() {
    const text = taskInput.value.trim();

    // Validation
    if (text === '') {
        showError('⚠️ Please enter a task!');
        taskInput.focus();
        return;
    }

    if (text.length < 3) {
        showError('⚠️ Task must be at least 3 characters!');
        return;
    }

    if (text.length > 100) {
        showError('⚠️ Task must be less than 100 characters!');
        return;
    }

    // Check for duplicate
    const isDuplicate = tasks.some(
        task => task.text.toLowerCase() === text.toLowerCase()
    );
    if (isDuplicate) {
        showError('⚠️ This task already exists!');
        return;
    }

    // Create task object
    const newTask = {
        id: generateId(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    // Add to array (at beginning so newest shows first)
    tasks.unshift(newTask);

    // Save and render
    saveTasks();
    renderTasks();

    // Clear input
    taskInput.value = '';
    taskInput.focus();
}

// TOGGLE - Mark task as complete/incomplete
function toggleTask(id) {
    // Find the task and flip its completed status
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });

    saveTasks();
    renderTasks();
}

// UPDATE - Edit a task's text
function editTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;

    // Use prompt for simple editing
    const newText = prompt('Edit your task:', task.text);

    // If user cancels, newText will be null
    if (newText === null) return;

    const trimmedText = newText.trim();

    if (trimmedText === '') {
        showError('⚠️ Task cannot be empty!');
        return;
    }

    // Update the task
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, text: trimmedText };
        }
        return task;
    });

    saveTasks();
    renderTasks();
}

// DELETE - Remove a single task
function deleteTask(id) {
    // Confirm before deleting
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }
}

// DELETE COMPLETED - Remove all completed tasks
function clearCompleted() {
    const hasCompleted = tasks.some(task => task.completed);
    if (!hasCompleted) {
        showError('⚠️ No completed tasks to clear!');
        return;
    }

    if (confirm('Delete all completed tasks?')) {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }
}

// ---------- FILTERING ----------
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Set filter
        currentFilter = btn.getAttribute('data-filter');
        // Re-render
        renderTasks();
    });
});

// ---------- EVENT LISTENERS ----------
// Add task on button click
addTaskBtn.addEventListener('click', addTask);

// Add task on Enter key press
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Clear completed tasks
clearCompletedBtn.addEventListener('click', clearCompleted);

// ---------- INITIALIZATION ----------
// This runs when the page first loads
function init() {
    loadTheme();
    loadTasks();
    renderTasks();
}

// Start the app!
init();

// Log welcome message for developers
console.log('🚀 TaskFlow is ready!');
console.log(`📋 ${tasks.length} tasks loaded from storage`);