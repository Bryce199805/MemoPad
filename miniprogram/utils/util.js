function daysLeft(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function priorityLabel(p) {
  return { high: 'High', medium: 'Medium', low: 'Low' }[p] || 'Medium'
}

function priorityClass(p) {
  return { high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' }[p] || 'badge-warning'
}

function daysClass(days) {
  if (days < 0) return 'text-danger'
  if (days <= 3) return 'text-warning'
  return 'text-accent'
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

module.exports = { daysLeft, formatDate, formatDateFull, priorityLabel, priorityClass, daysClass, formatTime }
