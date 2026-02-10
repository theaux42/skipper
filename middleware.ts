
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'default-secret-key-change-me'
const key = new TextEncoder().encode(SECRET_KEY)

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value

    // Public paths
    if (request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/setup') ||
        request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/favicon.ico')) {
        return NextResponse.next()
    }

    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
        await jwtVerify(session, key, { algorithms: ['HS256'] })
        return NextResponse.next()
    } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url))
    }
}

export const config = {
    matcher: ['/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)'],
}
