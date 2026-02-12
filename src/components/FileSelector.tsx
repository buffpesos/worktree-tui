import { useState, useMemo } from "react"
import { useKeyboard } from "@opentui/react"

interface FileSelectorProps {
  files: string[]
  focused: boolean
  onConfirm: (selected: string[]) => void
  onSkip: () => void
}

type Row =
  | { kind: "dir"; name: string; depth: number; children: string[] }
  | { kind: "file"; name: string; fullPath: string; depth: number }

function buildRows(files: string[]): Row[] {
  const rootFiles: string[] = []
  const dirMap = new Map<string, string[]>()

  for (const file of files) {
    const slashIndex = file.indexOf("/")
    if (slashIndex === -1) {
      rootFiles.push(file)
    } else {
      const dir = file.slice(0, slashIndex)
      if (!dirMap.has(dir)) dirMap.set(dir, [])
      dirMap.get(dir)!.push(file)
    }
  }

  const rows: Row[] = []

  // Directories first (sorted), then root-level files (sorted)
  for (const dir of [...dirMap.keys()].sort()) {
    const children = dirMap.get(dir)!.sort()
    rows.push({ kind: "dir", name: dir, depth: 0, children })
    for (const child of children) {
      rows.push({
        kind: "file",
        name: child.slice(dir.length + 1),
        fullPath: child,
        depth: 1,
      })
    }
  }

  for (const file of rootFiles.sort()) {
    rows.push({ kind: "file", name: file, fullPath: file, depth: 0 })
  }

  return rows
}

export function FileSelector({ files, focused, onConfirm, onSkip }: FileSelectorProps) {
  const rows = useMemo(() => buildRows(files), [files])
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  useKeyboard((key) => {
    if (!focused) return

    if (key.name === "up") {
      setCursor((c) => Math.max(0, c - 1))
    } else if (key.name === "down") {
      setCursor((c) => Math.min(rows.length - 1, c + 1))
    } else if (key.name === "space") {
      const row = rows[cursor]!
      setSelected((prev) => {
        const next = new Set(prev)
        if (row.kind === "dir") {
          const allSelected = row.children.every((f) => prev.has(f))
          if (allSelected) {
            for (const f of row.children) next.delete(f)
          } else {
            for (const f of row.children) next.add(f)
          }
        } else {
          if (next.has(row.fullPath)) {
            next.delete(row.fullPath)
          } else {
            next.add(row.fullPath)
          }
        }
        return next
      })
    } else if (key.name === "a") {
      setSelected(new Set(files))
    } else if (key.name === "d") {
      setSelected(new Set())
    } else if (key.name === "return") {
      if (selected.size > 0) {
        onConfirm(files.filter((f) => selected.has(f)))
      } else {
        onSkip()
      }
    } else if (key.name === "escape") {
      onSkip()
    }
  })

  const visibleHeight = 10
  const half = Math.floor(visibleHeight / 2)
  let scrollStart = Math.max(0, cursor - half)
  if (scrollStart + visibleHeight > rows.length) {
    scrollStart = Math.max(0, rows.length - visibleHeight)
  }
  const visibleRows = rows.slice(scrollStart, scrollStart + visibleHeight)

  function dirCheckStatus(children: string[]): "all" | "some" | "none" {
    const count = children.filter((f) => selected.has(f)).length
    if (count === children.length) return "all"
    if (count > 0) return "some"
    return "none"
  }

  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="column" gap={0}>
        {visibleRows.map((row, i) => {
          const realIndex = scrollStart + i
          const isCursor = realIndex === cursor

          if (row.kind === "dir") {
            const status = dirCheckStatus(row.children)
            const checkbox = status === "all" ? "[x]" : status === "some" ? "[-]" : "[ ]"
            const checkColor = status === "none" ? "#565f89" : "#9ece6a"
            return (
              <box key={`dir-${row.name}`} flexDirection="row" gap={1}>
                <text fg={isCursor ? "#7aa2f7" : "#565f89"}>
                  {isCursor ? ">" : " "}
                </text>
                <text fg={checkColor}>{checkbox}</text>
                <text fg={isCursor ? "#c0caf5" : "#bb9af7"}>{row.name}/</text>
                <text fg="#565f89">
                  ({row.children.length} file{row.children.length !== 1 ? "s" : ""})
                </text>
              </box>
            )
          }

          const isSelected = selected.has(row.fullPath)
          const indent = row.depth > 0 ? "  " : ""
          return (
            <box key={row.fullPath} flexDirection="row" gap={1}>
              <text fg={isCursor ? "#7aa2f7" : "#565f89"}>
                {isCursor ? ">" : " "}
              </text>
              <text fg={isSelected ? "#9ece6a" : "#565f89"}>
                {indent}{isSelected ? "[x]" : "[ ]"}
              </text>
              <text fg={isCursor ? "#c0caf5" : "#a9b1d6"}>{row.name}</text>
            </box>
          )
        })}
      </box>
      {rows.length > visibleHeight && (
        <text fg="#414868">
          {"  "}{scrollStart + 1}-{Math.min(scrollStart + visibleHeight, rows.length)} of {rows.length}
        </text>
      )}
      <box flexDirection="row" gap={2}>
        <text fg="#565f89">
          {selected.size}/{files.length} selected
        </text>
      </box>
      <text fg="#565f89">
        Space: toggle  a: all  d: none  Enter: confirm  Escape: skip
      </text>
    </box>
  )
}
