
'use client'

import { useState, useEffect } from 'react'
import { listUserRepos, listBranches, listFiles, type GitHubRepo, type FileNode } from '@/lib/actions/github-actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface GitHubPickerProps {
    onSelect: (data: { repoUrl: string, branch: string, path: string }) => void
    mode: 'DOCKERFILE' | 'COMPOSE'
}

export function GitHubPicker({ onSelect, mode }: GitHubPickerProps) {
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [loadingRepos, setLoadingRepos] = useState(false)
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)

    const [branches, setBranches] = useState<string[]>([])
    const [loadingBranches, setLoadingBranches] = useState(false)
    const [selectedBranch, setSelectedBranch] = useState<string>('')

    const [files, setFiles] = useState<FileNode[]>([])
    const [loadingFiles, setLoadingFiles] = useState(false)
    const [currentPath, setCurrentPath] = useState('')
    const [selectedPath, setSelectedPath] = useState('')

    useEffect(() => {
        loadRepos()
    }, [])

    async function loadRepos() {
        setLoadingRepos(true)
        const res = await listUserRepos()
        if (res.success && res.repos) {
            setRepos(res.repos)
        }
        setLoadingRepos(false)
    }

    async function handleRepoChange(repoId: string) {
        const repo = repos.find(r => r.id.toString() === repoId)
        if (!repo) return
        setSelectedRepo(repo)
        setSelectedBranch('')
        setFiles([])
        setCurrentPath('')

        setLoadingBranches(true)
        const res = await listBranches(repo.full_name.split('/')[0], repo.name)
        if (res.success && res.branches) {
            setBranches(res.branches)
            if (res.branches.includes(repo.default_branch)) {
                handleBranchChange(repo.default_branch, repo)
            } else if (res.branches.length > 0) {
                handleBranchChange(res.branches[0], repo)
            }
        }
        setLoadingBranches(false)
    }

    async function handleBranchChange(branch: string, repo = selectedRepo) {
        if (!repo) return
        setSelectedBranch(branch)
        loadFiles(repo, branch, '')
    }

    async function loadFiles(repo: GitHubRepo, branch: string, path: string) {
        setLoadingFiles(true)
        const res = await listFiles(repo.full_name.split('/')[0], repo.name, branch, path)
        if (res.success && res.files) {
            setFiles(res.files)
            setCurrentPath(path)
        }
        setLoadingFiles(false)
    }

    function handleFileClick(file: FileNode) {
        if (file.type === 'tree') {
            loadFiles(selectedRepo!, selectedBranch, file.path)
        } else {
            // Check if matches mode
            if (mode === 'DOCKERFILE' && !file.path.endsWith('Dockerfile') && !file.path.endsWith('.dockerfile')) {
                // Warning? Allow any file?
            }
            setSelectedPath(file.path)
            onSelect({
                repoUrl: selectedRepo!.html_url,
                branch: selectedBranch,
                path: file.path
            })
        }
    }

    function handleBack() {
        if (!currentPath) return
        const parent = currentPath.split('/').slice(0, -1).join('/')
        loadFiles(selectedRepo!, selectedBranch, parent)
    }

    return (
        <div className="grid gap-4 p-4 border rounded-md">
            <div className="grid gap-2">
                <Label>Repository</Label>
                <Select onValueChange={handleRepoChange} disabled={loadingRepos}>
                    <SelectTrigger>
                        <SelectValue placeholder={loadingRepos ? "Loading..." : "Select Repository"} />
                    </SelectTrigger>
                    <SelectContent>
                        {repos.map(repo => (
                            <SelectItem key={repo.id} value={repo.id.toString()}>
                                {repo.full_name} {repo.private && '🔒'}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedRepo && (
                <div className="grid gap-2">
                    <Label>Branch</Label>
                    <Select value={selectedBranch} onValueChange={(v) => handleBranchChange(v)} disabled={loadingBranches}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {selectedBranch && (
                <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                        <Label>Select {mode === 'DOCKERFILE' ? 'Dockerfile' : 'Compose File'}</Label>
                        {currentPath && <Button variant="ghost" size="sm" onClick={handleBack}>Back</Button>}
                    </div>
                    <ScrollArea className="h-[200px] border rounded-md p-2">
                        {loadingFiles ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="space-y-1">
                                {files.map(file => (
                                    <div
                                        key={file.sha}
                                        className={`flex items-center gap-2 p-1.5 rounded-sm cursor-pointer hover:bg-muted ${selectedPath === file.path ? 'bg-primary/20' : ''}`}
                                        onClick={() => handleFileClick(file)}
                                    >
                                        <span className="text-xs">{file.type === 'tree' ? '📁' : '📄'}</span>
                                        <span className="text-sm truncate">{file.path.split('/').pop()}</span>
                                    </div>
                                ))}
                                {files.length === 0 && <div className="text-sm text-muted-foreground p-2">No files found</div>}
                            </div>
                        )}
                    </ScrollArea>
                    {selectedPath && <p className="text-xs text-muted-foreground">Selected: {selectedPath}</p>}
                </div>
            )}
        </div>
    )
}
