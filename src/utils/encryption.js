// App 2 — on the redirect page
import CryptoJS from 'crypto-js'

const params = new URLSearchParams(window.location.search)
const encrypted = decodeURIComponent(params.get('auth'))

try {
  const decrypted = CryptoJS.AES.decrypt(encrypted, import.meta.env.VITE_REDIRECT_SECRET)
  const payload = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8))

  // Check expiry
  if (Date.now() > payload.exp) {
    throw new Error('Link expired')
  }

  console.log(payload.email, payload.corpId)
  // pre-fill form or identify user
} catch (e) {
  // redirect to normal login
  window.location.href = '/login'
}