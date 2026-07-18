import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClarityProvider from "@/components/ClarityProvider";
import PostHogProvider from "@/components/PostHogProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RepoMap | Interactive Codebase Visualization",
  description: "Visualize, analyze, and explore the architecture and function call graphs of your GitHub repositories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ClarityProvider />
        <PostHogProvider />
      </body>
    </html>
  );
}
