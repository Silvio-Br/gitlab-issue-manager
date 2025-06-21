import CryptoJS from "crypto-js"

// Generate a device-specific key based on browser fingerprint
function getDeviceKey(): string {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.textBaseline = "top"
    ctx.font = "14px Arial"
    ctx.fillText("Device fingerprint", 2, 2)
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|")

  return CryptoJS.SHA256(fingerprint).toString()
}

export function encryptToken(token: string): string {
  const deviceKey = getDeviceKey()
  return CryptoJS.AES.encrypt(token, deviceKey).toString()
}

export function decryptToken(encryptedToken: string): string {
  try {
    const deviceKey = getDeviceKey()
    const bytes = CryptoJS.AES.decrypt(encryptedToken, deviceKey)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error("Failed to decrypt token:", error)
    return ""
  }
}
