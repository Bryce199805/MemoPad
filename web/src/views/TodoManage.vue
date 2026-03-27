<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('todo.title') }}</h1>
      <button @click="showAddModal = true" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto">
        + {{ $t('todo.add') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col md:flex-row gap-2">
      <input v-model="search" type="text" :placeholder="$t('todo.search')" class="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
      <select v-model="filterPriority" class="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white md:w-40">
        <option value="">{{ $t('todo.all') }}</option>
        <option value="high">{{ $t('todo.high') }}</option>
        <option value="medium">{{ $t('todo.medium') }}</option>
        <option value="low">{{ $t('todo.low') }}</option>
      </select>
      <select v-model="filterDone" class="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white md:w-40">
        <option value="">{{ $t('todo.all') }}</option>
        <option value="false">{{ $t('todo.pending') }}</option>
        <option value="true">{{ $t('todo.done') }}</option>
      </select>
    </div>

    <!-- Todo List -->
    <div class="space-y-2">
      <div v-for="todo in filteredTodos" :key="todo.id" class="bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-4">
        <div class="flex items-start gap-3">
          <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)" class="w-5 h-5 mt-0.5 rounded" />
          <div class="flex-1 min-w-0">
            <p :class="{ 'line-through text-gray-400': todo.done }" class="text-gray-900 dark:text-white break-words">{{ todo.content }}</p>
            <div class="flex flex-wrap gap-1 mt-2">
              <span :class="priorityClass(todo.priority)" class="text-xs px-2 py-0.5 rounded">{{ $t(`todo.${todo.priority}`) }}</span>
              <span v-if="todo.category" class="text-xs px-2 py-0.5 rounded" :style="{ backgroundColor: todo.category.color + '20', color: todo.category.color }">{{ todo.category.name }}</span>
            </div>
          </div>
          <div class="flex gap-1">
            <button @click="pinTodo(todo.id)" :class="todo.pinned ? 'text-orange-500' : 'text-gray-400'" class="p-1 md:p-2 text-lg">📌</button>
            <button @click="editTodo(todo)" class="p-1 md:p-2 text-lg">✏️</button>
            <button @click="deleteTodo(todo.id)" class="p-1 md:p-2 text-lg">🗑️</button>
          </div>
        </div>
      </div>
      <p v-if="filteredTodos.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-8">{{ $t('todo.noTodos') }}</p>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">{{ editingTodo ? $t('todo.edit') : $t('todo.add') }}</h2>
        <form @submit.prevent="saveTodo">
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300">{{ $t('todo.content') }}</label>
              <textarea v-model="form.content" required rows="3" class="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
            </div>
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300">{{ $t('todo.priority') }}</label>
              <select v-model="form.priority" class="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="high">{{ $t('todo.high') }}</option>
                <option value="medium">{{ $t('todo.medium') }}</option>
                <option value="low">{{ $t('todo.low') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300">{{ $t('todo.category') }}</label>
              <select v-model="form.category_id" class="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option :value="null">{{ $t('category.noCategory') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row justify-end gap-2 mt-6">
            <button type="button" @click="closeModal" class="px-4 py-2 border rounded-lg dark:border-gray-600 dark:text-white order-2 sm:order-1">{{ $t('common.cancel') }}</button>
            <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded-lg order-1 sm:order-2">{{ $t('common.save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '../stores/todo'
import { useCategoryStore } from '../stores/category'
import { storeToRefs } from 'pinia'

const todoStore = useTodoStore()
const categoryStore = useCategoryStore()
const { todos } = storeToRefs(todoStore)
const { categories } = storeToRefs(categoryStore)

const search = ref('')
const filterPriority = ref('')
const filterDone = ref('')
const showAddModal = ref(false)
const editingTodo = ref(null)
const form = ref({ content: '', priority: 'medium', category_id: null })

const filteredTodos = computed(() => {
  return todos.value.filter(todo => {
    const matchSearch = todo.content.toLowerCase().includes(search.value.toLowerCase())
    const matchPriority = !filterPriority.value || todo.priority === filterPriority.value
    const matchDone = filterDone.value === '' || todo.done.toString() === filterDone.value
    return matchSearch && matchPriority && matchDone
  })
})

const priorityClass = (priority) => ({
  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300': priority === 'high',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300': priority === 'medium',
  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': priority === 'low'
})

const toggleTodo = async (id) => { await todoStore.toggleTodo(id) }
const pinTodo = async (id) => { await todoStore.pinTodo(id) }
const deleteTodo = async (id) => { await todoStore.deleteTodo(id) }

const editTodo = (todo) => {
  editingTodo.value = todo
  form.value = { content: todo.content, priority: todo.priority, category_id: todo.category_id }
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingTodo.value = null
  form.value = { content: '', priority: 'medium', category_id: null }
}

const saveTodo = async () => {
  if (editingTodo.value) {
    await todoStore.updateTodo(editingTodo.value.id, form.value)
  } else {
    await todoStore.createTodo(form.value)
  }
  closeModal()
}

onMounted(() => {
  todoStore.fetchTodos()
  categoryStore.fetchCategories()
})
</script>
