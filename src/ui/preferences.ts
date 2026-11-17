export function preference(key: string): string | null {
  try {
    return localStorage.getItem('poppay-' + key)
  } catch {
    return null
  }
}
export function savePreference(key: string, value: string) {
  try {
    localStorage.setItem('poppay-' + key, value)
  } catch {
    /* Preferences are optional. */
  }
}
