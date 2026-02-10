
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

export default async function LoginPage() {
    // Check if any users exist
    const userCount = await db.user.count()
    if (userCount === 0) {
        redirect('/setup')
    }

    async function login(formData: FormData) {
        'use server'
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        if (!email || !password) return

        const user = await db.user.findUnique({
            where: { email }
        })

        if (!user) {
            // Handle invalid user
            return
        }

        const isValid = await verifyPassword(password, user.passwordHash)
        if (!isValid) {
            // Handle invalid password
            return
        }

        await createSession(user.id, user.role)
        redirect('/')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
            <div className="w-full max-w-md p-8 bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl">
                <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

                <form action={login} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input name="email" type="email" className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input name="password" type="password" className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-white" required />
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-bold py-2 rounded hover:bg-zinc-200 transition">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    )
}
