<script setup lang="ts">
defineProps<{
  status: string
  preserveLog: boolean
  query: string
  canStart: boolean
  canStop: boolean
}>()

const emit = defineEmits<{
  start: []
  stop: []
  reload: []
  clear: []
  toggleSettings: []
  'update:preserveLog': [value: boolean]
  'update:query': [value: string]
}>()

const statusClass = (status: string) => {
  if (status === 'Recording') return 'recording'
  if (status === 'Connection error' || status === 'Session expired') return 'error'
  if (status === 'Connecting' || status === 'Reconnecting') return 'connecting'
  return ''
}
</script>

<template>
  <div class="toolbar">
    <div class="status">
      <span class="status-dot" :class="statusClass(status)" />
      <span>{{ status }}</span>
    </div>

    <button class="primary" type="button" :disabled="!canStart" @click="emit('start')">
      Start recording
    </button>
    <button type="button" :disabled="!canStop" @click="emit('stop')">
      Stop
    </button>
    <button type="button" :disabled="!canStart && !canStop" @click="emit('reload')">
      Reload & record
    </button>
    <button type="button" @click="emit('clear')">
      Clear
    </button>

    <label class="checkbox">
      <input
        type="checkbox"
        :checked="preserveLog"
        @change="emit('update:preserveLog', ($event.target as HTMLInputElement).checked)"
      >
      Preserve log
    </label>

    <input
      type="text"
      :value="query"
      placeholder="Filter"
      aria-label="Filter requests"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
    >

    <button type="button" @click="emit('toggleSettings')">
      Settings
    </button>
  </div>
</template>
