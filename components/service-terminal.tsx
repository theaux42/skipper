
'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import io from 'socket.io-client'
import '@xterm/xterm/css/xterm.css'
import { Loader2 } from 'lucide-react'

export function ServiceTerminal({ serviceId, containerId }: { serviceId: string, containerId: string | null }) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const socketRef = useRef<any>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const [connected, setConnected] = useState(false)

    useEffect(() => {
        if (!containerId || !terminalRef.current) return

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#09090b', // zinc-950
                foreground: '#f4f4f5', // zinc-100
                cursor: '#e4e4e7',
                selectionBackground: '#3f3f46',
            },
            convertEol: true, // Treat \n as \r\n
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current = term
        fitAddonRef.current = fitAddon

        // Initialize Socket.io
        const socket = io({
            path: '/api/socket',
        })
        socketRef.current = socket

        socket.on('connect', () => {
            term.write('\r\n\x1b[32m✔ Connecting to terminal...\x1b[0m\r\n')
            socket.emit('attach-container', { containerId })
        })

        socket.on('data', (data: string) => {
            term.write(data)
            setConnected(true)
        })

        socket.on('error', (err: string) => {
            term.write(`\r\n\x1b[31mtimestamp Error: ${err}\x1b[0m\r\n`)
            setConnected(false)
        })

        socket.on('disconnect', () => {
            term.write('\r\n\x1b[33m⚠ Disconnected from server\x1b[0m\r\n')
            setConnected(false)
        })

        // Handle input
        term.onData((data) => {
            socket.emit('data', data)
        })

        // Handle resize
        const handleResize = () => {
            fitAddon.fit()
            if (socket.connected) {
                socket.emit('resize', { cols: term.cols, rows: term.rows })
            }
        }

        window.addEventListener('resize', handleResize)

        // Initial resize after a short delay to ensure container is rendered
        setTimeout(() => {
            fitAddon.fit()
            socket.emit('resize', { cols: term.cols, rows: term.rows })
        }, 100)

        return () => {
            socket.disconnect()
            term.dispose()
            window.removeEventListener('resize', handleResize)
            socketRef.current = null
            xtermRef.current = null
        }
    }, [containerId])

    if (!containerId) {
        return (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground border border-zinc-800 rounded-lg bg-zinc-950/50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-zinc-600" />
                    <p>Waiting for container...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[600px] w-full bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 relative group">
            <div ref={terminalRef} className="h-full w-full p-2" />
            {!connected && (
                <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
                </div>
            )}
        </div>
    )
}
