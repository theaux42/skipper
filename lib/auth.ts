
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'default-secret-key-change-me'
const key = new TextEncoder().encode(SECRET_KEY)

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash)
}

export async function createSession(userId: string, role: string) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
    const session = await new SignJWT({ userId, role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key)

    const cookieStore = await cookies()
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires,
        sameSite: 'lax',
        path: '/',
    })
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return null

    try {
        const { payload } = await jwtVerify(session, key, {
            algorithms: ['HS256'],
        })
        return payload as { userId: string; role: string }
    } catch (error) {
        return null
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.set('session', '', { expires: new Date(0) })
}
