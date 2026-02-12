import { $ } from "bun"

export interface Worktree {
  path: string
  head: string
  branch: string
  bare: boolean
  detached: boolean
}

export interface Branch {
  name: string
  isRemote: boolean
  current: boolean
}

export interface Result {
  success: boolean
  message: string
}

function parseGitError(e: any): string {
  const raw = String(e?.stderr ?? e?.message ?? e)
  const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean)
  const fatal = lines.find((l: string) => l.startsWith("fatal:"))
  if (fatal) return fatal.replace("fatal: ", "")
  const error = lines.find((l: string) => l.startsWith("error:"))
  if (error) return error.replace("error: ", "")
  // Fallback: return the last non-empty line (skip progress noise)
  return lines[lines.length - 1] || "Unknown error"
}

export async function listWorktrees(): Promise<Worktree[]> {
  try {
    const output = await $`git worktree list --porcelain`.text()
    const blocks = output.trim().split("\n\n").filter(Boolean)
    return blocks.map((block) => {
      const lines = block.split("\n")
      const wt: Worktree = {
        path: "",
        head: "",
        branch: "",
        bare: false,
        detached: false,
      }
      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          wt.path = line.slice("worktree ".length)
        } else if (line.startsWith("HEAD ")) {
          wt.head = line.slice("HEAD ".length)
        } else if (line.startsWith("branch ")) {
          wt.branch = line.slice("branch ".length).replace("refs/heads/", "")
        } else if (line === "bare") {
          wt.bare = true
        } else if (line === "detached") {
          wt.detached = true
        }
      }
      return wt
    })
  } catch {
    return []
  }
}

export async function addWorktree(
  path: string,
  branch: string,
  createNew: boolean
): Promise<Result> {
  try {
    if (createNew) {
      await $`git worktree add ${path} -b ${branch}`.text()
    } else {
      await $`git worktree add ${path} ${branch}`.text()
    }
    return { success: true, message: `Worktree created at ${path}` }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function removeWorktree(
  path: string,
  force: boolean
): Promise<Result> {
  try {
    if (force) {
      await $`git worktree remove --force ${path}`.text()
    } else {
      await $`git worktree remove ${path}`.text()
    }
    return { success: true, message: `Worktree removed: ${path}` }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function pruneWorktrees(): Promise<Result> {
  try {
    await $`git worktree prune`.text()
    return { success: true, message: "Stale worktree references pruned" }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function listBranches(): Promise<Branch[]> {
  try {
    const output = await $`git branch -a --no-color`.text()
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const current = line.startsWith("* ")
        const name = line.replace(/^\*?\s+/, "").trim()
        const isRemote = name.startsWith("remotes/")
        return {
          name: isRemote ? name.replace("remotes/", "") : name,
          isRemote,
          current,
        }
      })
      .filter((b) => !b.name.includes("HEAD ->"))
  } catch {
    return []
  }
}

export async function listUntrackedFiles(worktreePath: string): Promise<string[]> {
  try {
    const output =
      await $`git -C ${worktreePath} ls-files --others --exclude-standard`.text()
    const gitIgnored =
      await $`git -C ${worktreePath} ls-files --others --ignored --exclude-standard`.text()

    // Standard untracked: keep non-hidden files only
    const standard = output.trim().split("\n").filter(Boolean)
      .filter((f) => {
        const name = f.includes("/") ? f.slice(f.lastIndexOf("/") + 1) : f
        return !name.startsWith(".") && name !== "DS_Store"
      })

    // From gitignored: only .env* files
    const envFiles = gitIgnored.trim().split("\n").filter(Boolean)
      .filter((f) => {
        const name = f.includes("/") ? f.slice(f.lastIndexOf("/") + 1) : f
        return name.startsWith(".env")
      })

    return [...standard, ...envFiles]
  } catch {
    return []
  }
}

export async function copyFile(
  src: string,
  dest: string
): Promise<Result> {
  try {
    await $`cp ${src} ${dest}`.text()
    return { success: true, message: `Copied ${src} to ${dest}` }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function symlinkFile(
  target: string,
  link: string
): Promise<Result> {
  try {
    await $`ln -sf ${target} ${link}`.text()
    return { success: true, message: `Symlinked ${link} -> ${target}` }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function isGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --git-dir`.text()
    return true
  } catch {
    return false
  }
}

export async function cloneBare(
  url: string,
  targetDir: string
): Promise<Result> {
  try {
    await $`git clone --bare ${url} ${targetDir}`.text()
    return { success: true, message: `Cloned bare repo to ${targetDir}` }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function fixBareRemoteFetch(bareDir: string): Promise<Result> {
  try {
    const refspec = "+refs/heads/*:refs/remotes/origin/*"
    await $`git -C ${bareDir} config remote.origin.fetch ${refspec}`.text()
    await $`git -C ${bareDir} fetch origin`.text()
    return { success: true, message: "Remote fetch config fixed" }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export interface RepoInfo {
  root: string
  remote: string
  currentBranch: string
}

export async function getRepoInfo(): Promise<RepoInfo | null> {
  try {
    const root = (await $`git rev-parse --show-toplevel`.text()).trim()
    let remote = ""
    try {
      remote = (await $`git remote get-url origin`.text()).trim()
    } catch {}
    let currentBranch = ""
    try {
      currentBranch = (await $`git branch --show-current`.text()).trim()
    } catch {}
    return { root, remote, currentBranch }
  } catch {
    return null
  }
}

export async function fetchOrigin(): Promise<Result> {
  try {
    await $`git fetch origin`.text()
    return { success: true, message: "Fetched latest from origin" }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function getUmbrellaRoot(): Promise<string | null> {
  try {
    const commonDir = (
      await $`git rev-parse --git-common-dir`.text()
    ).trim()
    const { resolve } = await import("path")
    const resolved = resolve(commonDir)
    if (resolved.endsWith(".bare")) {
      // Parent of .bare is the umbrella root
      const { dirname } = await import("path")
      return dirname(resolved)
    }
    return null
  } catch {
    return null
  }
}

export async function createUmbrella(
  remote: string,
  targetDir: string
): Promise<Result> {
  try {
    const bareDir = `${targetDir}/.bare`

    const cloneResult = await cloneBare(remote, bareDir)
    if (!cloneResult.success) return cloneResult

    await Bun.write(`${targetDir}/.git`, `gitdir: ./.bare\n`)

    const fetchResult = await fixBareRemoteFetch(bareDir)
    if (!fetchResult.success) return fetchResult

    try {
      await $`git -C ${targetDir} worktree add ${targetDir}/main main`.text()
    } catch (e: any) {
      return { success: false, message: parseGitError(e) }
    }

    return { success: true, message: `Umbrella created at ${targetDir}` }
  } catch (e: any) {
    return { success: false, message: parseGitError(e) }
  }
}

export async function copyToShared(
  sourceDir: string,
  files: string[],
  umbrellaRoot: string
): Promise<number> {
  const { join, dirname } = await import("path")
  const sharedDir = join(umbrellaRoot, ".shared")
  let count = 0
  for (const file of files) {
    const src = join(sourceDir, file)
    const dest = join(sharedDir, file)
    const destDir = dirname(dest)
    try {
      await $`mkdir -p ${destDir}`.text()
      await $`cp ${src} ${dest}`.text()
      count++
    } catch {}
  }
  return count
}

export async function symlinkFromShared(
  umbrellaRoot: string,
  worktreePath: string,
  specificFiles?: string[]
): Promise<number> {
  const { join, dirname } = await import("path")
  const sharedDir = join(umbrellaRoot, ".shared")
  const files = specificFiles ?? await listSharedFiles(umbrellaRoot)
  let count = 0
  for (const file of files) {
    const src = join(sharedDir, file)
    const dest = join(worktreePath, file)
    const destDir = dirname(dest)
    try {
      await $`mkdir -p ${destDir}`.text()
    } catch {}
    const result = await symlinkFile(src, dest)
    if (result.success) count++
  }
  return count
}

export async function listSharedFiles(umbrellaRoot: string): Promise<string[]> {
  const { join } = await import("path")
  const sharedDir = join(umbrellaRoot, ".shared")
  try {
    const output = await $`find ${sharedDir} -type f`.text()
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((f) => f.slice(sharedDir.length + 1))
  } catch {
    return []
  }
}
