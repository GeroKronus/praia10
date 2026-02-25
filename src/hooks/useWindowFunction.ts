'use client'

import { useEffect } from 'react'

export function useWindowFunction(name: string, callback: (id: string) => void) {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any)[name] = (id: string) => callback(id)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[name]
    }
  }, [name, callback])
}
