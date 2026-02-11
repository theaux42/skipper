"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Command } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("signin");
    const [registrationAllowed, setRegistrationAllowed] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    useEffect(() => {
        const checkRegistration = async () => {
            try {
                const res = await fetch('/api/auth/registration-status');
                const data = await res.json();
                setRegistrationAllowed(data.allowed);
                // If registration is allowed, default to signup? No, usually signin is better default.
                // But if it's the VERY first user, maybe signup?
                // Let's stick to signin default, but ensure signup tab is available.
            } catch (error) {
                console.error("Failed to check registration status", error);
            } finally {
                setCheckingStatus(false);
            }
        };
        checkRegistration();
    }, []);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authClient.signIn.email({
                email,
                password,
            }, {
                onSuccess: () => {
                    toast.success("Signed in successfully");
                    // Force reload to ensure session cookies are picked up
                    window.location.href = "/";
                },
                onError: (ctx: any) => {
                    toast.error(ctx.error.message);
                    setIsLoading(false);
                }
            });
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred");
            setIsLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authClient.signUp.email({
                email,
                password,
                name,
            }, {
                onSuccess: () => {
                    toast.success("Account created successfully");
                    window.location.href = "/";
                },
                onError: (ctx: any) => {
                    toast.error(ctx.error.message);
                    setIsLoading(false);
                }
            });
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred");
            setIsLoading(false);
        }
    };

    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background text-foreground">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/login-bg.png"
                        alt="Background"
                        fill
                        className="object-cover opacity-80"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                </div>
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <Command className="mr-2 h-6 w-6" />
                    Homelab PaaS
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;Manage your Docker infrastructure with the precision and elegance it deserves.&rdquo;
                        </p>
                    </blockquote>
                </div>
            </div>
            <div className="lg:p-8 relative z-10 w-full">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {activeTab === "signin" ? "Welcome back" : "Create an account"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {activeTab === "signin"
                                ? "Enter your credentials to access your dashboard"
                                : "Enter your email below to create your account"}
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {registrationAllowed && !checkingStatus && (
                            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
                                <TabsTrigger value="signin">Sign In</TabsTrigger>
                                <TabsTrigger value="signup">Register</TabsTrigger>
                            </TabsList>
                        )}

                        <TabsContent value="signin">
                            <form onSubmit={handleSignIn} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signin-email">Email</Label>
                                    <Input
                                        id="signin-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                        className="bg-background/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signin-password">Password</Label>
                                    <Input
                                        id="signin-password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        className="bg-background/50"
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>
                        </TabsContent>

                        {registrationAllowed && (
                            <TabsContent value="signup">
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-name">Name</Label>
                                        <Input
                                            id="signup-name"
                                            type="text"
                                            placeholder="John Doe"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={isLoading}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email</Label>
                                        <Input
                                            id="signup-email"
                                            type="email"
                                            placeholder="name@example.com"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isLoading}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Password</Label>
                                        <Input
                                            id="signup-password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            minLength={8}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating account...
                                            </>
                                        ) : (
                                            "Create Account"
                                        )}
                                    </Button>
                                </form>
                            </TabsContent>
                        )}
                    </Tabs>

                    {!registrationAllowed && !checkingStatus && (
                        <p className="px-8 text-center text-sm text-muted-foreground">
                            Registration is currently disabled. <br />
                            Only the owner can access this panel.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
