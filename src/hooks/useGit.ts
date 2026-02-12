import { useState, useEffect, useCallback } from "react"
import type { Worktree, Branch, Result } from "../utils/git.ts"
import * as git from "../utils/git.ts"

export function useWorktrees() {
  const [worktrees, setWorktrees] = useState<Worktree[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const wts = await git.listWorktrees()
    setWorktrees(wts)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (path: string, branch: string, createNew: boolean) => {
      const result = await git.addWorktree(path, branch, createNew)
      if (result.success) await refresh()
      return result
    },
    [refresh]
  )

  const remove = useCallback(
    async (path: string, force: boolean) => {
      const result = await git.removeWorktree(path, force)
      if (result.success) await refresh()
      return result
    },
    [refresh]
  )

  const prune = useCallback(async () => {
    const result = await git.pruneWorktrees()
    if (result.success) await refresh()
    return result
  }, [refresh])

  return { worktrees, loading, refresh, add, remove, prune }
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const br = await git.listBranches()
    setBranches(br)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { branches, loading, refresh }
}

export function useGitAction() {
  const [status, setStatus] = useState<Result | null>(null)

  const run = useCallback(async (action: () => Promise<Result>) => {
    setStatus(null)
    const result = await action()
    setStatus(result)
    return result
  }, [])

  const clear = useCallback(() => setStatus(null), [])

  return { status, run, clear }
}
