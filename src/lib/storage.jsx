import { createContext, useContext } from 'react'

// Storage wrapper that mimics the window.storage API from Claude artifacts
// but uses localStorage for persistence across browser sessions
const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key)
      return value ? { key, value } : null
    } catch {
      return null
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(key, value)
      return { key, value }
    } catch {
      return null
    }
  },

  async delete(key) {
    try {
      localStorage.removeItem(key)
      return { key, deleted: true }
    } catch {
      return null
    }
  },

  async list(prefix = '') {
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key)
        }
      }
      return { keys, prefix }
    } catch {
      return { keys: [] }
    }
  }
}

// Attach to window to match artifact API
if (typeof window !== 'undefined') {
  window.storage = storage
}

const StorageContext = createContext(null)

export function StorageProvider({ children }) {
  return (
    <StorageContext.Provider value={storage}>
      {children}
    </StorageContext.Provider>
  )
}

export function useStorage() {
  return useContext(StorageContext)
}

export default storage
