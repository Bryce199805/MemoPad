<template>
  <div class="todos-page">
    <div class="page-header">
      <div class="header-content">
        <h1>Tasks</h1>
        <p class="subtitle">{{ pendingCount }} pending · {{ doneCount }} completed</p>
      </div>
      <Button @click="openModal()" variant="primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Task
      </Button>
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
      <select v-model="filterDone" class="filter-select">
        <option value="">All Status</option>
        <option value="false">Pending</option>
        <option value="true">Completed</option>
      </select>
    </div>

    <!-- Pinned Section -->
    <div v-if="pinnedTodos.length > 0" class="section">
      <h2 class="section-title">📌 Pinned</h2>
      <div class="todo-list">
        <TodoItem
          v-for="todo in pinnedTodos"
          :key="todo.id"
          :todo="todo"
          :categories="categories"
          @toggle="toggleTodo"
          @pin="pinTodo"
          @edit="openModal"
          @delete="deleteTodo"
        />
      </div>
    </div>

    <!-- Regular Section -->
    <div v-if="regularTodos.length > 0" class="section">
      <h2 v-if="pinnedTodos.length > 0" class="section-title">All Tasks</h2>
      <div class="todo-list">
        <TodoItem
          v-for="todo in regularTodos"
          :key="todo.id"
          :todo="todo"
          :categories="categories"
          @toggle="toggleTodo"
          @pin="pinTodo"
          @edit="openModal"
          @delete="deleteTodo"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTodos.length === 0 && !todoStore.loading" class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>No tasks yet</h3>
      <p>Create your first task to get started</p>
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
                <select v-model="form.category_id">
                  <option :value="null">No Category</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
              </div>
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
import { ref, computed, onMounted, watch } from 'vue'
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
const filterDone = ref('')
const showModal = ref(false)
const editingTodo = ref(null)
const enableDueDate = ref(false)
const form = ref({
  content: '',
  priority: 'medium',
  category_id: null,
  due_date: ''
})

const filteredTodos = computed(() => {
  return todos.value.filter(todo => {
    const matchSearch = todo.content.toLowerCase().includes(search.value.toLowerCase())
    const matchPriority = !filterPriority.value || todo.priority === filterPriority.value
    const matchDone = filterDone.value === '' || todo.done.toString() === filterDone.value
    return matchSearch && matchPriority && matchDone
  })
})

const pinnedTodos = computed(() => filteredTodos.value.filter(t => t.pinned && !t.done))
const regularTodos = computed(() => filteredTodos.value.filter(t => !t.pinned || t.done))
const pendingCount = computed(() => todos.value.filter(t => !t.done).length)
const doneCount = computed(() => todos.value.filter(t => t.done).length)

function openModal(todo = null) {
  editingTodo.value = todo
  if (todo) {
    enableDueDate.value = !!todo.due_date
    form.value = {
      content: todo.content,
      priority: todo.priority,
      category_id: todo.category_id,
      due_date: todo.due_date ? todo.due_date.slice(0, 16) : ''
    }
  } else {
    enableDueDate.value = false
    form.value = { content: '', priority: 'medium', category_id: null, due_date: '' }
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingTodo.value = null
}

async function saveTodo() {
  const data = {
    ...form.value,
    due_date: enableDueDate.value ? form.value.due_date : null
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

/* Filters */
.filters {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
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

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
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
