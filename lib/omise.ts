// Omise client — lazy init so missing keys don't crash at module load
let _omise: any = null

export function getOmise() {
  if (!_omise) {
    const Omise = require('omise')
    _omise = Omise({
      publicKey: process.env.OMISE_PUBLIC_KEY || '',
      secretKey: process.env.OMISE_SECRET_KEY || '',
    })
  }
  return _omise
}

export function isOmiseConfigured() {
  return !!(process.env.OMISE_PUBLIC_KEY && process.env.OMISE_SECRET_KEY)
}
