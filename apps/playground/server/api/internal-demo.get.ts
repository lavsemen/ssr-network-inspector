export default defineEventHandler(() => {
  return {
    type: 'internal',
    message: 'Nitro local demo endpoint',
    timestamp: Date.now(),
  }
})
