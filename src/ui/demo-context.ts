import { createContext, useContext } from 'react'
import type { Command, Snapshot, Workspace } from '../core/model'

export interface DemoContext {
  snapshot: Snapshot
  workspace: Workspace
  day: string
  route: (path: string) => string
  run: (cmd: Command, opId: string) => Promise<Snapshot>
  reset: () => Promise<void>
  toast: (message: string) => void
}
export const Demo = createContext<DemoContext | null>(null)
export function useDemo() {
  const context = useContext(Demo)
  if (!context) throw new Error('Open the demo workspace first.')
  return context
}
