import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { useWorktrees } from "../hooks/useGit.ts"

interface WorktreeListProps {
  focused: boolean
  onStatus: (msg: string) => void
  onOpen: (path: string) => void
}

type ConfirmAction =
  | { kind: "remove"; path: string; branch: string }
  | { kind: "prune" }

export function WorktreeList({ focused, onStatus, onOpen }: WorktreeListProps) {
  const { worktrees: allWorktrees, loading, refresh, remove, prune } = useWorktrees()
  const worktrees = allWorktrees.filter((wt) => !wt.bare)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    if (!focused) return

    if (confirmAction) {
      if (key.name === "y") {
        if (confirmAction.kind === "remove") {
          performRemove(confirmAction.path)
        } else {
          performPrune()
        }
      } else if (key.name === "n" || key.name === "escape") {
        setConfirmAction(null)
        onStatus("")
      }
      return
    }

    if (key.name === "r") {
      refresh()
      onStatus("Refreshed worktree list")
    }
    if (key.name === "p") {
      setConfirmAction({ kind: "prune" })
    }
    if (key.name === "d") {
      const wt = worktrees[selectedIndex]
      if (wt) {
        setConfirmAction({
          kind: "remove",
          path: wt.path,
          branch: wt.branch || "(detached)",
        })
      }
    }
  })

  async function performRemove(path: string) {
    const result = await remove(path, false)
    onStatus(result.success ? result.message : `Error: ${result.message}`)
    setConfirmAction(null)
  }

  async function performPrune() {
    const result = await prune()
    onStatus(result.message)
    setConfirmAction(null)
  }

  const handleSelect = (index: number) => {
    const wt = worktrees[index]
    if (!wt) return
    onOpen(wt.path)
  }

  if (loading) {
    return (
      <box flexGrow={1} justifyContent="center" alignItems="center">
        <text fg="#565f89">Loading worktrees...</text>
      </box>
    )
  }

  if (worktrees.length === 0) {
    return (
      <box flexGrow={1} justifyContent="center" alignItems="center">
        <text fg="#565f89">No worktrees found. Is this a git repository?</text>
      </box>
    )
  }

  const options = worktrees.map((wt) => {
    const status = wt.detached ? " [detached]" : ""
    return {
      name: `${wt.branch || "(no branch)"}${status}`,
      description: `${wt.path}  ${wt.head.slice(0, 8)}`,
      value: wt.path,
    }
  })

  if (confirmAction?.kind === "remove") {
    return (
      <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
        <text>
          <span fg="#f7768e">
            <strong>{"Remove worktree?"}</strong>
          </span>
        </text>
        <box
          flexDirection="column"
          border
          borderStyle="rounded"
          borderColor="#f7768e"
          padding={1}
          gap={0}
        >
          <box flexDirection="row" gap={1}>
            <text fg="#565f89">{"Branch:"}</text>
            <text fg="#a9b1d6">{confirmAction.branch}</text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg="#565f89">{"Path:"}</text>
            <text fg="#a9b1d6">{confirmAction.path}</text>
          </box>
        </box>
        <box flexDirection="column" paddingLeft={1}>
          <text fg="#a9b1d6">{"This will:"}</text>
          <text fg="#565f89">{"  - Delete the directory and all its contents"}</text>
          <text fg="#565f89">{"  - Unlink the worktree from the bare repo"}</text>
          <text fg="#565f89">{"  - The branch itself will NOT be deleted"}</text>
        </box>
        <text fg="#e0af68">{"Proceed? (y/n)"}</text>
      </box>
    )
  }

  if (confirmAction?.kind === "prune") {
    return (
      <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
        <text>
          <span fg="#e0af68">
            <strong>{"Prune stale worktree references?"}</strong>
          </span>
        </text>
        <box flexDirection="column" paddingLeft={1}>
          <text fg="#a9b1d6">{"This will:"}</text>
          <text fg="#565f89">{"  Remove worktree entries whose directories no longer exist on disk."}</text>
          <text fg="#565f89">{"  This is safe - it only cleans up bookkeeping, no files are deleted."}</text>
        </box>
        <text fg="#e0af68">{"Proceed? (y/n)"}</text>
      </box>
    )
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      <box padding={1}>
        <text>
          <span fg="#7aa2f7">
            <strong>{worktrees.length}</strong>
          </span>
          <span fg="#a9b1d6">{` worktree${worktrees.length !== 1 ? "s" : ""}`}</span>
        </text>
      </box>
      <box flexGrow={1} paddingLeft={1} paddingRight={1}>
        <select
          options={options}
          focused={focused && !confirmAction}
          onSelect={(index) => handleSelect(index)}
          onChange={(index) => setSelectedIndex(index)}
          height={15}
          showScrollIndicator
        />
      </box>
    </box>
  )
}

export const WORKTREE_SHORTCUTS = [
  { key: "Enter", action: "open in iTerm2" },
  { key: "d", action: "delete" },
  { key: "r", action: "refresh" },
  { key: "p", action: "prune" },
]
