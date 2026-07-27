<script setup lang="ts">
import type { InspectorSettings } from '../stores/inspector-store'

defineProps<{
  settings: InspectorSettings
}>()

const emit = defineEmits<{
  'update:settings': [settings: InspectorSettings]
}>()

function update<K extends keyof InspectorSettings>(key: K, value: InspectorSettings[K], settings: InspectorSettings) {
  emit('update:settings', {
    ...settings,
    [key]: value,
  })
}
</script>

<template>
  <div class="settings">
    <label>
      Server origin
      <input
        type="text"
        :value="settings.serverOrigin"
        @input="update('serverOrigin', ($event.target as HTMLInputElement).value, settings)"
      >
    </label>
    <label>
      Route prefix
      <input
        type="text"
        :value="settings.routePrefix"
        @input="update('routePrefix', ($event.target as HTMLInputElement).value, settings)"
      >
    </label>
    <label>
      Path prefix
      <input
        type="text"
        :value="settings.pathPrefix"
        placeholder="/playgrounds/ssr-network-inspector"
        @input="update('pathPrefix', ($event.target as HTMLInputElement).value, settings)"
      >
    </label>
    <label>
      Inspector admin token
      <input
        type="password"
        :value="settings.adminToken"
        autocomplete="off"
        @input="update('adminToken', ($event.target as HTMLInputElement).value, settings)"
      >
    </label>
    <label class="checkbox">
      <input
        type="checkbox"
        :checked="settings.rememberToken"
        @change="update('rememberToken', ($event.target as HTMLInputElement).checked, settings)"
      >
      Remember token
    </label>
    <label>
      HTTP Basic username (gateway)
      <input
        type="text"
        :value="settings.basicAuthUsername"
        placeholder="yt_basic"
        autocomplete="off"
        @input="update('basicAuthUsername', ($event.target as HTMLInputElement).value, settings)"
      >
    </label>
    <label>
      HTTP Basic password (gateway)
      <input
        type="password"
        :value="settings.basicAuthPassword"
        autocomplete="off"
        @input="update('basicAuthPassword', ($event.target as HTMLInputElement).value, settings)"
      >
    </label>
    <label class="checkbox">
      <input
        type="checkbox"
        :checked="settings.rememberBasicAuth"
        @change="update('rememberBasicAuth', ($event.target as HTMLInputElement).checked, settings)"
      >
      Remember HTTP Basic credentials
    </label>
  </div>
</template>
