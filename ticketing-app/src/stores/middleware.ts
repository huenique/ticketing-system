import { StateCreator, StoreMutatorIdentifier } from 'zustand'

// Define a type for the persist middleware
type PersistOptions<T> = {
  name: string
  partialize?: (state: T) => Partial<T>
}

// Type for the middleware
type Persist = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  options: PersistOptions<T>
) => StateCreator<T, Mps, Mcs>

// Implementation of the persist middleware
export const persist = (<T,>() => (f: any, options: PersistOptions<T>) => 
  (set: any, get: any, store: any) => {
    const { name, partialize = (state: T) => state as unknown as Partial<T> } = options

    // Try to get the stored state from localStorage
    const savedState = (() => {
      try {
        const data = localStorage.getItem(name)
        if (data) return JSON.parse(data)
      } catch (error) {
        console.error(`Error loading state from localStorage for ${name}:`, error)
      }
      return {}
    })()

    // Create a function to save state to localStorage
    const saveState = () => {
      try {
        const state = get()
        const persistedState = partialize(state)
        localStorage.setItem(name, JSON.stringify(persistedState))
      } catch (error) {
        console.error(`Error saving state to localStorage for ${name}:`, error)
      }
    }

    // Create a wrapped setter that persists after each update
    const persistSet = (state: any, replace?: boolean) => {
      set(state, replace)
      saveState()
    }

    // Call the store creator with our wrapped set function
    const state = f(persistSet, get, store)

    return {
      ...state,
      ...savedState
    }
  }
)() as Persist 