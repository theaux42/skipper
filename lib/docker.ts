
import Docker from 'dockerode'

const dockerSingleton = () => {
    return new Docker({ socketPath: '/var/run/docker.sock' })
}

type DockerSingleton = ReturnType<typeof dockerSingleton>

const globalForDocker = globalThis as unknown as {
    docker: DockerSingleton | undefined
}

export const docker = globalForDocker.docker ?? dockerSingleton()

if (process.env.NODE_ENV !== 'production') globalForDocker.docker = docker
