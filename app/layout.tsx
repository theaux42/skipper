
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Skipper",
  description: "Self-hosted PaaS for managing Docker and Tunnels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="flex min-h-screen bg-background">
            <SidebarWrapper />
            <main className="flex-1 overflow-y-auto bg-background">
              {children}
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
