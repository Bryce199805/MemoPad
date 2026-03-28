<template>
  <div class="todos-page">
    <div class="page-header">
      <div class="header-content">
        <h1>Tasks</h1>
        <p class="subtitle">{{ pendingCount }} pending · {{ doneCount }} completed</p>
      </div>
      <div class="header-actions">
        <Button v-if="selectedIds.size > 0" variant="danger" @click="batchDelete">
          Delete ({{ selectedIds.size }})
        </Button>
        <Button v-if="selectedIds.size > 0" variant="secondary" @click="batchComplete">
          Complete ({{ selectedIds.size }})
        </Button>
        <Button v-if="selectedIds.size > 0" variant="secondary" @click="clearSelection">
          Cancel
        </Button>
        <Button @click="openModal()" variant="primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Task
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters glass-card">
      <div class="search-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input v-model="search" type="text" placeholder="Search tasks..." />
      </div>
      <select v-model="filterPriority" class="filter-select">
        <option value="">All Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select v-model="filterStatus" class="filter-select">
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="">All</option>
      </select>
      <Button 
        :variant="selectMode ? 'primary' : 'secondary'" 
        size="sm" 
        @click="toggleSelectMode"
      >
        {{ selectMode ? 'Done' : 'Select' }}
      </Button>
    </div>

    <!-- Pinned Section -->
    <div v-if="pinnedTodos.length > 0 && filterStatus !== 'completed'" class="section">
      <h2 class="section-title">📌 Pinned</h2>
      <div class="todo-list">
        <TodoItem
          v-for="todo in pinnedTodos"
          :key="todo.id"
          :todo="todo"
          :categories="categories"
          :selectable="selectMode"
          :selected="selectedIds.has(todo.id)"
          @toggle="toggleTodo"
          @pin="pinTodo"
          @edit="openModal"
          @delete="deleteTodo"
          @select="toggleSelect(todo.id)"
        />
      </div>
    </div>

    <!-- Regular Section -->
    <div v-if="regularTodos.length > 0 && filterStatus !== 'completed'" class="section">
      <h2 v-if="pinnedTodos.length > 0" class="section-title">All Tasks</h2>
      <div class="todo-list">
        <TodoItem
          v-for="todo in regularTodos"
          :key="todo.id"
          :todo="todo"
          :categories="categories"
          :selectable="selectMode"
          :selected="selectedIds.has(todo.id)"
          @toggle="toggleTodo"
          @pin="pinTodo"
          @edit="openModal"
          @delete="deleteTodo"
          @select="toggleSelect(todo.id)"
        />
      </div>
    </div>

    <!-- Completed Section -->
    <div v-if="completedTodos.length > 0 && filterStatus !== 'pending'" class="section completed-section">
      <div class="section-header">
        <h2 class="section-title">✓ Completed</h2>
        <button v-if="completedTodos.length > 0" class="clear-completed" @click="clearCompleted">
          Clear all completed
        </button>
      </div>
      <div class="todo-list">
        <TodoItem
          v-for="todo in completedTodos"
          :key="todo.id"
          :todo="todo"
          :categories="categories"
          :selectable="selectMode"
          :selected="selectedIds.has(todo.id)"
          @toggle="toggleTodo"
          @pin="pinTodo"
          @edit="openModal"
          @delete="deleteTodo"
          @select="toggleSelect(todo.id)"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTodos.length === 0 && !todoStore.loading" class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>{{ filterStatus === 'completed' ? 'No completed tasks' : 'No tasks yet' }}</h3>
      <p>{{ filterStatus === 'completed' ? 'Complete some tasks to see them here' : 'Create your first task to get started' }}</p>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal glass-card">
          <div class="modal-header">
            <h2>{{ editingTodo ? 'Edit Task' : 'New Task' }}</h2>
          </div>
          <form @submit.prevent="saveTodo" class="modal-body">
            <div class="form-group">
              <label>Content</label>
              <textarea
                v-model="form.content"
                required
                rows="3"
                placeholder="What needs to be done?"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Priority</label>
                <select v-model="form.priority">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div class="form-group">
                <label>Category</label>
                <div class="category-select-wrapper">
                  <select v-model="form.category_id">
                    <option :value="null">No Category</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                      {{ cat.name }}
                    </option>
                  </select>
                  <button type="button" class="add-category-btn" @click="showAddCategory = true" title="Add new category">
                    +
                  </button>
                </div>
              </div>
            </div>

            <!-- Add Category Inline -->
            <div v-if="showAddCategory" class="inline-category-form">
              <input 
                v-model="newCategoryName" 
                type="text" 
                placeholder="Category name"
                class="category-input"
              />
              <input 
                v-model="newCategoryColor" 
                type="color" 
                class="color-picker"
              />
              <button type="button" class="save-category-btn" @click="createCategory">Save</button>
              <button type="button" class="cancel-category-btn" @click="showAddCategory = false">✕</button>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="enableDueDate" />
                <span>Set due date</span>
              </label>
              <input
                v-if="enableDueDate"
                v-model="form.due_date"
                type="datetime-local"
                :min="minDateTime"
              />
            </div>
          </form>
          <div class="modal-footer">
            <Button variant="secondary" @click="closeModal">Cancel</Button>
            <Button variant="primary" @click="saveTodo">Save</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '../stores/todo'
import { useCategoryStore } from '../stores/category'
import { storeToRefs } from 'pinia'
import Button from '../components/ui/Button.vue'
import TodoItem from '../components/TodoItem.vue'

const todoStore = useTodoStore()
const categoryStore = useCategoryStore()
const { todos } = storeToRefs(todoStore)
const { categories } = storeToRefs(categoryStore)

const search = ref('')
const filterPriority = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingTodo = ref(null)
const enableDueDate = ref(false)
const showAddCategory = ref(false)
const newCategoryName = ref('')
const newCategoryColor = ref('#6366f1')
const selectMode = ref(false)
const selectedIds = ref(new Set())

// Color palette for categories
const categoryColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899']

// Generate random color different from existing categories
function generateRandomColor() {
  const usedColors = categories.value.map(c => c.color)
  const available = categoryColors.filter(c => !usedColors.includes(c))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }
  return categoryColors[Math.floor(Math.random() * categoryColors.length)]
}

const form = ref({
  content: '',
  priority: 'medium',
  category_id: null,
  due_date: ''
})

// Minimum datetime for picker (now)
const minDateTime = computed(() => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
})

const filteredTodos = computed(() => {
  return todos.value.filter(todo => {
    const matchSearch = todo.content.toLowerCase().includes(search.value.toLowerCase())
    const matchPriority = !filterPriority.value || todo.priority === filterPriority.value
    const matchStatus = filterStatus.value === '' || 
      (filterStatus.value === 'completed' && todo.done) ||
      (filterStatus.value === 'pending' && !todo.done)
    return matchSearch && matchPriority && matchStatus
  })
})

const pinnedTodos = computed(() => filteredTodos.value.filter(t => t.pinned && !t.done))
const regularTodos = computed(() => filteredTodos.value.filter(t => !t.pinned && !t.done))
const completedTodos = computed(() => filteredTodos.value.filter(t => t.done))
const pendingCount = computed(() => todos.value.filter(t => !t.done).length)
const doneCount = computed(() => todos.value.filter(t => t.done).length)

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    selectedIds.value.clear()
  }
}

function toggleSelect(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function clearSelection() {
  selectedIds.value.clear()
  selectMode.value = false
}

async function batchDelete() {
  if (!confirm(`Delete ${selectedIds.value.size} tasks?`)) return
  
  for (const id of selectedIds.value) {
    await todoStore.deleteTodo(id)
  }
  clearSelection()
}

async function batchComplete() {
  for (const id of selectedIds.value) {
    const todo = todos.value.find(t => t.id === id)
    if (todo && !todo.done) {
      await todoStore.toggleTodo(id)
    }
  }
  clearSelection()
}

async function clearCompleted() {
  const completed = todos.value.filter(t => t.done)
  if (!confirm(`Delete ${completed.length} completed tasks?`)) return
  
  for (const todo of completed) {
    await todoStore.deleteTodo(todo.id)
  }
}

function openModal(todo = null) {
  editingTodo.value = todo
  showAddCategory.value = false
  newCategoryName.value = ''
  newCategoryColor.value = generateRandomColor()
  
  if (todo) {
    enableDueDate.value = !!todo.due_date
    form.value = {
      content: todo.content,
      priority: todo.priority,
      category_id: todo.category_id,
      due_date: todo.due_date ? formatDateTimeLocal(todo.due_date) : ''
    }
  } else {
    enableDueDate.value = false
    form.value = { content: '', priority: 'medium', category_id: null, due_date: '' }
  }
  showModal.value = true
}

function formatDateTimeLocal(dateStr) {
  const date = new Date(dateStr)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function closeModal() {
  showModal.value = false
  editingTodo.value = null
  showAddCategory.value = false
}

async function createCategory() {
  if (!newCategoryName.value.trim()) return
  
  await categoryStore.createCategory({
    name: newCategoryName.value.trim(),
    color: newCategoryColor.value
  })
  
  // Select the new category
  const newCat = categories.value[categories.value.length - 1]
  if (newCat) {
    form.value.category_id = newCat.id
  }
  
  showAddCategory.value = false
  newCategoryName.value = ''
  newCategoryColor.value = generateRandomColor()
}

async function saveTodo() {
  const data = {
    ...form.value,
    due_date: enableDueDate.value && form.value.due_date ? new Date(form.value.due_date).toISOString() : null
  }

  if (editingTodo.value) {
    await todoStore.updateTodo(editingTodo.value.id, data)
  } else {
    await todoStore.createTodo(data)
  }
  closeModal()
}

const toggleTodo = (id) => todoStore.toggleTodo(id)
const pinTodo = (id) => todoStore.pinTodo(id)
const deleteTodo = (id) => {
  if (confirm('Delete this task?')) {
    todoStore.deleteTodo(id)
  }
}

onMounted(() => {
  todoStore.fetchTodos()
  categoryStore.fetchCategories()
})
</script>

<style scoped>
.todos-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Filters */
.filters {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-input svg {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.search-input input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.filter-select {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  min-width: 120px;
}

/* Sections */
.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.clear-completed {
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 4px;
}

.clear-completed:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

.completed-section {
  opacity: 0.8;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 64px 32px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.3;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 14px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 12px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: var(--accent-primary);
  outline: none;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary);
}

/* Category Select with Add Button */
.category-select-wrapper {
  display: flex;
  gap: 8px;
}

.category-select-wrapper select {
  flex: 1;
}

.add-category-btn {
  width: 42px;
  background: var(--accent-gradient);
  border-radius: var(--radius-md);
  color: white;
  font-size: 20px;
  font-weight: 500;
}

.add-category-btn:hover {
  filter: brightness(1.1);
}

/* Inline Category Form */
.inline-category-form {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  align-items: center;
}

.category-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
}

.color-picker {
  width: 36px;
  height: 36px;
  padding: 2px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.save-category-btn {
  padding: 8px 16px;
  background: var(--success);
  border-radius: var(--radius-sm);
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.cancel-category-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
}

.cancel-category-btn:hover {
  color: var(--text-primary);
}

/* Responsive */
@media (max-width: 640px) {
  .filters {
    flex-direction: column;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
