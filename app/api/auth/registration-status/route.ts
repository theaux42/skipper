import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const userCount = await db.user.count();
        const allowed = userCount === 0;

        return NextResponse.json({
            allowed,
            count: userCount // Optional: helpful for debugging or showing "1 user registered" etc.
        });
    } catch (error) {
        console.error("Failed to check registration status:", error);
        return NextResponse.json({ allowed: false, error: "Internal Server Error" }, { status: 500 });
    }
}
