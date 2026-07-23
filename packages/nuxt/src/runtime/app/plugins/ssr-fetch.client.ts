import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      ssrFetch: $fetch,
    },
  }
})
