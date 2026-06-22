import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const SEAT_LOCK_TTL = 15 * 60 // 15 minutes in seconds

export function seatLockKey(sessionId: number, userId: string) {
  return `seat_lock:${sessionId}:${userId}`
}
