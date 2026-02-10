
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';

const BASE_DIR = '/opt/homelab-panel/apps';

export async function cloneOrPull(repoUrl: string, branch: string, projectId: string, serviceName: string) {
    const targetDir = path.join(BASE_DIR, projectId, serviceName);

    // Check if directory exists
    try {
        await fs.access(targetDir);
        // Exists, so pull
        const git = simpleGit(targetDir);
        await git.pull('origin', branch);
        return { type: 'update', path: targetDir };
    } catch {
        // Doesn't exist, clone
        await fs.mkdir(targetDir, { recursive: true });
        const git = simpleGit();
        await git.clone(repoUrl, targetDir, ['--branch', branch, '--depth', '1']);
        return { type: 'clone', path: targetDir };
    }
}

export function getServicePath(projectId: string, serviceName: string) {
    return path.join(BASE_DIR, projectId, serviceName);
}
