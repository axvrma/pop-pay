import { createContext, useContext } from 'react'
export const Theme = createContext({ theme: 'dark', toggle: () => {} })
export const useTheme = () => useContext(Theme)
