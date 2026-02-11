import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { User, Session } from "@prisma/client";

const baseURL = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : (process.env.BETTER_AUTH_BASE_URL || "https://panel.sputnk.net");

export const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: "sqlite",
    }),
    baseURL,
    trustedOrigins: [baseURL, "http://localhost:3000", "https://panel.sputnk.net"],
    emailAndPassword: {
        enabled: true,
        autoSignIn: true
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    const userCount = await db.user.count();
                    if (userCount === 0) {
                        return {
                            data: {
                                ...user,
                                role: "OWNER",
                            }
                        }
                    }
                    // Disable registration for others
                    // Returning false cancels the operation
                    throw new Error("Registration is disabled.");
                }
            }
        }
    },
    plugins: [
        nextCookies()
    ]
});

export const getSession = async () => {
    const result = await auth.api.getSession({
        headers: await headers()
    });
    if (!result) return null;

    const user = result.user as unknown as User;
    const session = result.session as unknown as Session;

    return {
        ...session,
        ...user,
        user,
        session,
        userId: session.userId,
        role: user.role
    }
}
