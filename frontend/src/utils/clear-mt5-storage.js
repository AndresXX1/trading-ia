export const clearMT5LocalStorage = () => {
  // Remove all MT5 related localStorage items
  localStorage.removeItem("mt5LastLogin")
  localStorage.removeItem("mt5LastServer")
  localStorage.removeItem("mt5Config")

  // Remove any other MT5 related items that might exist
  const keys = Object.keys(localStorage)
  keys.forEach((key) => {
    if (key.startsWith("mt5") || key.includes("MT5")) {
      localStorage.removeItem(key)
    }
  })

  console.log("[v0] Cleared all MT5 localStorage data")
}
