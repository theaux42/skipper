
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'

export default async function SetupPage() {
    const userCount = await db.user.count()
    if (userCount > 0) {
        redirect('/login')
    }

    async function createOwner(formData: FormData) {
        'use server'
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const name = formData.get('name') as string

        if (!email || !password) {
            // Handle error
            return
        }

        const hashedPassword = await hashPassword(password)

        const user = await db.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                role: 'OWNER',
                canExpose: true,
            }
        })

        await createSession(user.id, user.role)
        redirect('/dashboard')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
            <div className="w-full max-w-md p-8 bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl">
                <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Homelab Panel</h1>
                <p className="mb-6 text-zinc-400 text-center">Create the Owner account to get started.</p>

                <form action={createOwner} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input name="name" type="text" className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-white" placeholder="Administrator" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input name="email" type="email" className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-white" placeholder="admin@example.com" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input name="password" type="password" className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-white" required />
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-bold py-2 rounded hover:bg-zinc-200 transition">
                        Create Owner Account
                    </button>
                </form>
            </div>
        </div>
    )
}
