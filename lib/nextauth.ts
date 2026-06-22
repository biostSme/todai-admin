// next-auth replaced by custom JWT auth (lib/userauth.ts)
// keeping this file as re-export for any stale imports
export { getUserSession as auth } from './userauth'
