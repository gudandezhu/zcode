import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ContextPanel } from "@/components/context-panel";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zcode",
  description: "AI-powered software development platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-screen overflow-hidden">
        <AppProvider>
          <div className="h-full flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Topbar />
              <div className="flex-1 flex min-h-0 relative">
                <main className="flex-1 min-w-0 overflow-hidden">
                  {children}
                </main>
                <ContextPanel />
              </div>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
