import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";

export const metadata: Metadata = {
  title: "Velora - Premium Dating",
  description: "Premium, real-user-focused dating and chat platform.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/velora-mark.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthModalProvider>{children}</AuthModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
