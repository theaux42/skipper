
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const Docker = require('dockerode')

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const docker = new Docker()

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
    })

    const io = new Server(server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: { origin: '*' }
    })

    io.on('connection', (socket) => {
        let stream = null
        let container = null

        socket.on('attach-container', async ({ containerId }) => {
            if (!containerId) return

            try {
                container = docker.getContainer(containerId)

                const exec = await container.exec({
                    Cmd: ['/bin/sh'],
                    AttachStdin: true,
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: true,
                    Env: ['TERM=xterm-256color']
                })

                stream = await exec.start({
                    detach: false,
                    Tty: true,
                    stdin: true,
                    hijack: true
                })

                const duplex = stream.output || stream

                socket.emit('data', '\r\n\x1b[32m✔ Connected to container\x1b[0m\r\n')

                duplex.on('data', (chunk) => {
                    socket.emit('data', chunk.toString('utf-8'))
                })

                socket.on('data', (data) => {
                    if (duplex && !duplex.destroyed && duplex.writable) {
                        duplex.write(data)
                    }
                })

                socket.on('resize', async ({ cols, rows }) => {
                    if (exec) {
                        try {
                            await exec.resize({ w: cols, h: rows })
                        } catch (e) {
                            // ignore
                        }
                    }
                })

                duplex.on('end', () => {
                    socket.emit('end')
                    socket.disconnect()
                })

                socket.on('disconnect', () => {
                    if (duplex && !duplex.destroyed) {
                        duplex.end()
                    }
                })

            } catch (err) {
                console.error('[Socket] Attach error:', err)
                socket.emit('data', `\r\n\x1b[31mError attaching to container: ${err.message}\x1b[0m\r\n`)
            }
        })
    })

    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`)
    })
})
