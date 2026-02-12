import { useState, useEffect } from "react"
import { useKeyboard } from "@opentui/react"
import { useBranches, useWorktrees } from "../hooks/useGit.ts"
import * as git from "../utils/git.ts"
import { join } from "path"
import { FileSelector } from "./FileSelector.tsx"

interface AddWorktreeProps {
  focused: boolean
  onStatus: (msg: string) => void
  onInputFocus: (focused: boolean) => void
  onCreated: () => void
  umbrellaRoot: string
}

type Field = "mode" | "branch" | "path" | "branchName"
type View = "form" | "untracked"

export function AddWorktree({ focused, onStatus, onInputFocus, onCreated, umbrellaRoot }: AddWorktreeProps) {
  const { branches } = useBranches()
  const { worktrees } = useWorktrees()
  const [createNew, setCreateNew] = useState(false)
  const [path, setPath] = useState("")
  const [pathManuallyEdited, setPathManuallyEdited] = useState(false)
  const [branchName, setBranchName] = useState("")
  const [selectedBranch, setSelectedBranch] = useState(0)
  const [activeField, setActiveField] = useState<Field>("mode")

  const [view, setView] = useState<View>("form")
  const [untrackedFiles, setUntrackedFiles] = useState<string[]>([])
  const [newWorktreePath, setNewWorktreePath] = useState("")
  const [sourcePath, setSourcePath] = useState("")

  const checkedOutBranches = new Set(worktrees.map((w) => w.branch))
  const localBranches = branches.filter((b) => !b.isRemote && !checkedOutBranches.has(b.name))
  const noAvailableBranches = localBranches.length === 0

  useEffect(() => {
    if (noAvailableBranches) setCreateNew(true)
  }, [noAvailableBranches])

  const isTextInput = view === "form" && (activeField === "path" || activeField === "branchName")

  function pathFromBranch(branch: string): string {
    return branch.replace(/\//g, "-")
  }

  // Auto-fill path from selected branch (existing branch mode)
  useEffect(() => {
    if (createNew || pathManuallyEdited) return
    const b = localBranches[selectedBranch]
    if (b) setPath(pathFromBranch(b.name))
  }, [selectedBranch, createNew, localBranches.length])

  // Auto-fill path from typed branch name (new branch mode)
  useEffect(() => {
    if (!createNew || pathManuallyEdited) return
    if (branchName.trim()) {
      setPath(pathFromBranch(branchName.trim()))
    } else {
      setPath("")
    }
  }, [branchName, createNew])

  useEffect(() => {
    onInputFocus(isTextInput)
  }, [isTextInput, onInputFocus])

  const fields: Field[] = createNew
    ? ["mode", "branchName", "path"]
    : ["mode", "branch", "path"]

  function cycleField(dir: 1 | -1) {
    const idx = fields.indexOf(activeField)
    const next = (idx + dir + fields.length) % fields.length
    setActiveField(fields[next]!)
  }

  function resolvePath(): string {
    const p = path.trim()
    if (!p) return ""
    return p.startsWith("/") ? p : join(umbrellaRoot, p)
  }

  function resolvedBranch(): string {
    if (createNew) return branchName.trim()
    const b = localBranches[selectedBranch]
    return b?.name || ""
  }

  useKeyboard((key) => {
    if (!focused) return

    // untracked view is handled by FileSelector
    if (view === "untracked") return

    // Arrow up/down to cycle fields
    if (key.name === "down") {
      cycleField(1)
      return
    }
    if (key.name === "up") {
      cycleField(-1)
      return
    }

    // Escape exits text input back to mode
    if (isTextInput && key.name === "escape") {
      setActiveField("mode")
      return
    }

    if (key.name === "return" && activeField === "mode" && !noAvailableBranches) {
      setCreateNew(!createNew)
    }

    if (key.ctrl && key.name === "s") {
      executeCreate()
    }
  })

  function resetForm() {
    setPath("")
    setPathManuallyEdited(false)
    setBranchName("")
    setActiveField("mode")
    setView("form")
    setUntrackedFiles([])
    setNewWorktreePath("")
    setSourcePath("")
  }

  async function handleSharedSelection(selectedFiles: string[]) {
    if (sourcePath) {
      await git.copyToShared(sourcePath, selectedFiles, umbrellaRoot)
    }
    const count = await git.symlinkFromShared(umbrellaRoot, newWorktreePath, selectedFiles)
    onStatus(`Worktree created, symlinked ${count} file${count !== 1 ? "s" : ""}`)
    resetForm()
    onCreated()
  }

  function handleSharedSkip() {
    resetForm()
    onStatus("Worktree created (skipped symlinks)")
    onCreated()
  }

  async function executeCreate() {
    if (!path.trim()) {
      onStatus("Error: Path is required")
      return
    }

    const branch = resolvedBranch()
    if (!branch) {
      onStatus(
        createNew
          ? "Error: Branch name is required"
          : localBranches.length === 0
            ? "Error: All local branches already have worktrees"
            : "Error: No branch selected"
      )
      return
    }

    const resolvedPath = resolvePath()
    const result = await git.addWorktree(resolvedPath, branch, createNew)
    if (!result.success) {
      onStatus(`Error: ${result.message}`)
      setView("form")
      return
    }

    // Check .shared/ for files to symlink into the new worktree
    const sharedFiles = await git.listSharedFiles(umbrellaRoot)
    if (sharedFiles.length > 0) {
      setUntrackedFiles(sharedFiles)
      setNewWorktreePath(resolvedPath)
      setView("untracked")
      return
    }

    // No shared files yet — check existing worktrees for untracked files to share
    const sourceWorktree = worktrees.find((w) => !w.bare && w.path !== resolvedPath)
    if (sourceWorktree) {
      const files = await git.listUntrackedFiles(sourceWorktree.path)
      if (files.length > 0) {
        setUntrackedFiles(files)
        setNewWorktreePath(resolvedPath)
        setSourcePath(sourceWorktree.path)
        setView("untracked")
        return
      }
    }

    onStatus(result.message)
    resetForm()
    onCreated()
  }

  const branchOptions = localBranches.map((b) => ({
    name: b.name,
    description: b.current ? "(current)" : "",
  }))

  function fieldIndicator(field: Field) {
    return activeField === field ? " \u25B6 " : "   "
  }

  if (view === "untracked") {
    return (
      <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
        <text>
          <span fg="#9ece6a">
            <strong>Worktree created!</strong>
          </span>
        </text>
        <text fg="#a9b1d6">
          {sourcePath
            ? `Found ${untrackedFiles.length} untracked file${untrackedFiles.length !== 1 ? "s" : ""} in existing worktree. Select which to share:`
            : `Found ${untrackedFiles.length} shared file${untrackedFiles.length !== 1 ? "s" : ""} to symlink into the new worktree:`}
        </text>
        <FileSelector
          files={untrackedFiles}
          focused={focused}
          onConfirm={handleSharedSelection}
          onSkip={handleSharedSkip}
        />
        <box flexDirection="column" paddingLeft={1}>
          {sourcePath ? (
            <>
              <text fg="#565f89">
                Selected files will be copied to .shared/ and symlinked
              </text>
              <text fg="#565f89">
                into the new worktree. Future worktrees get them automatically.
              </text>
            </>
          ) : (
            <>
              <text fg="#565f89">
                These files live in .shared/ and are symlinked into each
              </text>
              <text fg="#565f89">
                worktree. A change in one is reflected everywhere.
              </text>
            </>
          )}
        </box>
      </box>
    )
  }

  const resolvedPreview = resolvePath()

  return (
    <box flexDirection="column" flexGrow={1} padding={1} gap={1}>
      <text>
        <strong>Add Worktree</strong>
      </text>

      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={activeField === "mode" ? "#7aa2f7" : "#414868"}>
          {fieldIndicator("mode")}
        </text>
        <text fg="#565f89">Mode:</text>
        <box
          border
          borderStyle="rounded"
          borderColor={activeField === "mode" ? "#7aa2f7" : "#414868"}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg={createNew ? "#9ece6a" : "#a9b1d6"}>
            {createNew ? "New branch" : "Existing branch"}
          </text>
        </box>
        {activeField === "mode" && !noAvailableBranches && (
          <text fg="#565f89">(Enter to toggle)</text>
        )}
      </box>

      {createNew ? (
        <box flexDirection="row" gap={1} alignItems="center">
          <text fg={activeField === "branchName" ? "#7aa2f7" : "#414868"}>
            {fieldIndicator("branchName")}
          </text>
          <text fg="#565f89">Branch:</text>
          <input
            value={branchName}
            onChange={setBranchName}
            placeholder="feature/my-branch"
            focused={focused && activeField === "branchName"}
            width={30}
            backgroundColor="#1a1b26"
            focusedBackgroundColor="#24283b"
            textColor="#c0caf5"
          />
        </box>
      ) : (
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={1}>
            <text fg={activeField === "branch" ? "#7aa2f7" : "#414868"}>
              {fieldIndicator("branch")}
            </text>
            <text fg="#565f89">Branch:</text>
          </box>
          <box paddingLeft={6} height={8}>
            {branchOptions.length > 0 ? (
              <select
                options={branchOptions}
                focused={focused && activeField === "branch"}
                onChange={(index) => setSelectedBranch(index)}
                height={8}
                showScrollIndicator
              />
            ) : (
              <text fg="#565f89">No local branches found</text>
            )}
          </box>
        </box>
      )}

      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={activeField === "path" ? "#7aa2f7" : "#414868"}>
          {fieldIndicator("path")}
        </text>
        <text fg="#565f89">Path:</text>
        <input
          value={path}
          onChange={(v: string) => { setPath(v); setPathManuallyEdited(true) }}
          placeholder="feature-cool"
          focused={focused && activeField === "path"}
          width={30}
          backgroundColor="#1a1b26"
          focusedBackgroundColor="#24283b"
          textColor="#c0caf5"
        />
      </box>

      {resolvedPreview && (
        <box paddingLeft={6}>
          <text fg="#414868">{resolvedPreview}</text>
        </box>
      )}

      <box marginTop={1}>
        <text fg="#565f89">
          {isTextInput
            ? "Type to edit  Up/Down: fields  Escape: back  Ctrl+S: save"
            : "Up/Down: navigate  Enter: toggle  Ctrl+S: save"}
        </text>
      </box>
    </box>
  )
}

export const ADD_SHORTCUTS = [
  { key: "\u2191\u2193", action: "fields" },
  { key: "Ctrl+S", action: "save" },
]
