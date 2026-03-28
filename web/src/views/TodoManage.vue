<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ $t('todo.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ pendingCount }} pending · {{ doneCount }} completed
        </p>
      </div>
      <button 
        @click="showAddModal = true" 
        class="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center gap-2"
      >
        <span class="text-lg">+</span>
        <span>{{ $t('todo.add') }}</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex flex-col md:flex-row gap-3">
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            v-model="search" 
            type="text" 
            :placeholder="$t('todo.search')" 
            class="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <select 
          v-model="filterPriority" 
          class="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white md:w-40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">{{ $t('todo.all') }} Priority</option>
          <option value="high">{{ $t('todo.high') }}</option>
          <option value="medium">{{ $t('todo.medium') }}</option>
          <option value="low">{{ $t('todo.low') }}</option>
        </select>
        <select 
          v-model="filterDone" 
          class="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white md:w-40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">{{ $t('todo.all') }}</option>
          <option value="false">{{ $t('todo.pending') }}</option>
          <option value="true">{{ $t('todo.done') }}</option>
        </select>
      </div>
    </div>

    <!-- Pinned Section -->
    <div v-if="pinnedTodos.length > 0" class="space-y-3">
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <span>📌</span> Pinned
      </h2>
      <div class="grid gap-3">
        <TodoItem
          v-for="todo in pinnedTodos"
          :key="todo.id"
          :todo="todo"
          :categories="categories"
          @toggle="toggleTodo"
          @pin="pinTodo"
          @edit="editTodo"
          @delete="deleteTodo"
        />
      </div>
    </div>

    <!-- Regular Todos -->
    <div class="space-y-3">
      <h2 v-if="pinnedTodos.length > 0" class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        All Tasks
      </h2>
      <div class="grid gap-3">
        <TodoItem
          v-for="todo in regularTodos"
          :key="todo.id"
          :todo="todo"
          :categories="categories"
          @toggle="toggleTodo"
          @pin="pinTodo"
          @edit="editTodo"
          @delete="deleteTodo"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTodos.length === 0" class="text-center py-16">
      <div class="text-6xl mb-4 opacity-30">📝</div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ $t('todo.noTodos') }}</h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">Create your first task to get started</p>
    </div>

    <!-- Add/Edit Modal -->
    <Transition name="modal">
      <div v-if="showAddModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeModal">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">
            {{ editingTodo ? $t('todo.edit') : 'New Task' }}
          </h2>
          <form @submit.prevent="saveTodo">
            <div class="space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('todo.content') }}</label>
                <textarea 
                  v-model="form.content" 
                  required 
                  rows="3" 
                  class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="What needs to be done?"
                ></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('todo.priority') }}</label>
                  <select 
                    v-model="form.priority" 
                    class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="high">{{ $t('todo.high') }}</option>
                    <option value="medium">{{ $t('todo.medium') }}</option>
                    <option value="low">{{ $t('todo.low') }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('todo.category') }}</label>
                  <select 
                    v-model="form.category_id" 
                    class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option :value="null">{{ $t('category.noCategory') }}</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
              </div>
              
              <!-- Due Date (Optional) -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                  <label class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <input 
                      type="checkbox" 
                      v-model="enableDueDate" 
                      class="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    Enable
                  </label>
                </div>
                <input 
                  v-if="enableDueDate"
                  v-model="form.due_date" 
                  type="datetime-local" 
                  class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p v-else class="text-sm text-gray-400 dark:text-gray-500 py-2">
                  No due date set
                </p>
              </div>
            </div>
            <div class="flex gap-3 mt-8">
              <button 
                type="button" 
                @click="closeModal" 
                class="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button 
                type="submit" 
                class="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25"
              >
                {{ $t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTodoStore } from '../stores/todo'
import { useCategoryStore } from '../stores/category'
import { storeToRefs } from 'pinia'
import TodoItem from '../components/TodoItem.vue'

const todoStore = useTodoStore()
const categoryStore = useCategoryStore()
const { todos } = storeToRefs(todoStore)
const { categories } = storeToRefs(categoryStore)

const search = ref('')
const filterPriority = ref('')
const filterDone = ref('')
const showAddModal = ref(false)
const editingTodo = ref(null)
const enableDueDate = ref(false)
const form = ref({ content: '', priority: 'medium', category_id: null, due_date: '' })

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

const toggleTodo = async (id) => { await todoStore.toggleTodo(id) }
const pinTodo = async (id) => { await todoStore.pinTodo(id) }
const deleteTodo = async (id) => { await todoStore.deleteTodo(id) }

const editTodo = (todo) => {
  editingTodo.value = todo
  const hasDueDate = !!todo.due_date
  enableDueDate.value = hasDueDate
  form.value = { 
    content: todo.content, 
    priority: todo.priority, 
    category_id: todo.category_id,
    due_date: hasDueDate ? todo.due_date.slice(0, 16) : ''
  }
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingTodo.value = null
  enableDueDate.value = false
  form.value = { content: '', priority: 'medium', category_id: null, due_date: '' }
}

const saveTodo = async () => {
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

onMounted(() => {
  todoStore.fetchTodos()
  categoryStore.fetchCategories()
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
