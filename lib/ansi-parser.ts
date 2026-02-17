/**
 * Parse ANSI escape codes into styled HTML spans.
 * Supports standard 8-color and bright color codes (30-37, 40-47, 90-97, 100-107),
 * bold, dim, italic, underline, and reset.
 */

interface AnsiStyle {
    color?: string
    backgroundColor?: string
    fontWeight?: string
    opacity?: string
    fontStyle?: string
    textDecoration?: string
}

const ANSI_COLORS: Record<number, string> = {
    30: '#6e6560',     // black (muted for readability)
    31: '#ef4444',     // red
    32: '#22c55e',     // green
    33: '#eab308',     // yellow
    34: '#3b82f6',     // blue
    35: '#a855f7',     // magenta
    36: '#06b6d4',     // cyan
    37: '#d6d3d1',     // white
    90: '#78716c',     // bright black (gray)
    91: '#f87171',     // bright red
    92: '#4ade80',     // bright green
    93: '#facc15',     // bright yellow
    94: '#60a5fa',     // bright blue
    95: '#c084fc',     // bright magenta
    96: '#22d3ee',     // bright cyan
    97: '#fafaf9',     // bright white
}

const ANSI_BG_COLORS: Record<number, string> = {
    40: '#1c1917',
    41: '#991b1b',
    42: '#166534',
    43: '#854d0e',
    44: '#1e3a5f',
    45: '#6b21a8',
    46: '#155e75',
    47: '#d6d3d1',
    100: '#44403c',
    101: '#dc2626',
    102: '#16a34a',
    103: '#ca8a04',
    104: '#2563eb',
    105: '#9333ea',
    106: '#0891b2',
    107: '#f5f5f4',
}

// Regex to match ANSI escape sequences: ESC[ ... m
// Handles both \x1b[ and \033[ formats
const ANSI_REGEX = /\x1b\[([0-9;]*)m/g

export interface AnsiSegment {
    text: string
    style: React.CSSProperties
}

export function parseAnsi(input: string): AnsiSegment[] {
    const segments: AnsiSegment[] = []
    let currentStyle: AnsiStyle = {}
    let lastIndex = 0

    // Also handle escaped versions that might come through as literal text
    const normalized = input
        .replace(/\[(\d+(?:;\d+)*)m/g, '\x1b[$1m')
        .replace(/\[0m/g, '\x1b[0m')

    ANSI_REGEX.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = ANSI_REGEX.exec(normalized)) !== null) {
        // Add text before this escape sequence
        if (match.index > lastIndex) {
            const text = normalized.slice(lastIndex, match.index)
            if (text) {
                segments.push({ text, style: { ...currentStyle } as React.CSSProperties })
            }
        }

        // Parse the codes
        const codes = match[1].split(';').map(Number).filter(n => !isNaN(n))

        if (codes.length === 0 || codes.includes(0)) {
            currentStyle = {}
        }

        for (const code of codes) {
            if (code === 0) {
                currentStyle = {}
            } else if (code === 1) {
                currentStyle.fontWeight = 'bold'
            } else if (code === 2) {
                currentStyle.opacity = '0.7'
            } else if (code === 3) {
                currentStyle.fontStyle = 'italic'
            } else if (code === 4) {
                currentStyle.textDecoration = 'underline'
            } else if (code === 22) {
                delete currentStyle.fontWeight
                delete currentStyle.opacity
            } else if (code === 23) {
                delete currentStyle.fontStyle
            } else if (code === 24) {
                delete currentStyle.textDecoration
            } else if (code === 39) {
                delete currentStyle.color
            } else if (code === 49) {
                delete currentStyle.backgroundColor
            } else if (ANSI_COLORS[code]) {
                currentStyle.color = ANSI_COLORS[code]
            } else if (ANSI_BG_COLORS[code]) {
                currentStyle.backgroundColor = ANSI_BG_COLORS[code]
            }
        }

        lastIndex = ANSI_REGEX.lastIndex
    }

    // Add remaining text
    if (lastIndex < normalized.length) {
        const text = normalized.slice(lastIndex)
        if (text) {
            segments.push({ text, style: { ...currentStyle } as React.CSSProperties })
        }
    }

    // If no segments were created (no ANSI codes found), return the original text
    if (segments.length === 0 && input.length > 0) {
        segments.push({ text: input, style: {} })
    }

    return segments
}

/**
 * Check if a string contains any ANSI escape codes
 */
export function hasAnsiCodes(input: string): boolean {
    return ANSI_REGEX.test(input) || /\[\d+(?:;\d+)*m/.test(input)
}
