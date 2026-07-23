import { timingSafeEqual } from 'node:crypto'

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)

  if (left.length !== right.length) {
    const dummy = Buffer.alloc(left.length)
    timingSafeEqual(left, dummy)
    return false
  }

  return timingSafeEqual(left, right)
}
