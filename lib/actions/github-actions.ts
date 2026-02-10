
'use server'

import { Octokit } from '@octokit/rest'
import { db } from '@/lib/db'

async function getOctokit() {
    const setting = await db.systemSetting.findUnique({
        where: { key: 'GITHUB_TOKEN' }
    })

    if (!setting?.value) {
        throw new Error('GitHub token not configured in System Settings')
    }

    return new Octokit({ auth: setting.value })
}

export interface GitHubRepo {
    id: number
    name: string
    full_name: string
    private: boolean
    html_url: string
    default_branch: string
}

export async function listUserRepos(): Promise<{ success: boolean, repos?: GitHubRepo[], error?: string }> {
    try {
        const octokit = await getOctokit()
        const { data } = await octokit.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 100,
            visibility: 'all'
        })

        return {
            success: true,
            repos: data.map(repo => ({
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                private: repo.private,
                html_url: repo.html_url,
                default_branch: repo.default_branch || 'main'
            }))
        }
    } catch (e: any) {
        console.error('GitHub API Error:', e)
        return { success: false, error: e.message }
    }
}

export async function listBranches(owner: string, repo: string): Promise<{ success: boolean, branches?: string[], error?: string }> {
    try {
        const octokit = await getOctokit()
        const { data } = await octokit.repos.listBranches({
            owner,
            repo
        })

        return { success: true, branches: data.map(b => b.name) }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export interface FileNode {
    path: string
    type: 'blob' | 'tree'
    sha: string
}

export async function listFiles(owner: string, repo: string, branch: string, path: string = ''): Promise<{ success: boolean, files?: FileNode[], error?: string }> {
    try {
        const octokit = await getOctokit()

        // Get the commit for the branch
        const { data: refData } = await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`
        })
        const sha = refData.object.sha

        // Get the tree (recursive to find files?) 
        // Or just list contents of path? 
        // octokit.repos.getContent is easier for browsing
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path,
                ref: branch
            })

            if (Array.isArray(data)) {
                const files: FileNode[] = data.map(item => ({
                    path: item.path,
                    type: item.type === 'dir' ? 'tree' : 'blob',
                    sha: item.sha
                }))
                return { success: true, files }
            }
            return { success: false, error: 'Path is not a directory' }
        } catch (e: any) {
            return { success: false, error: e.message }
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function checkGitHubToken(): Promise<{ configured: boolean }> {
    const setting = await db.systemSetting.findUnique({
        where: { key: 'GITHUB_TOKEN' }
    })
    return { configured: !!setting?.value }
}

export async function saveGitHubToken(token: string) {
    if (!token) {
        await db.systemSetting.delete({ where: { key: 'GITHUB_TOKEN' } }).catch(() => { })
        return { success: true }
    }

    await db.systemSetting.upsert({
        where: { key: 'GITHUB_TOKEN' },
        update: { value: token },
        create: {
            key: 'GITHUB_TOKEN',
            value: token,
            description: 'GitHub Personal Access Token for importing repositories'
        }
    })
    return { success: true }
}
