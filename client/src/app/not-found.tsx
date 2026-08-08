import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black/95 px-4 text-center">
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl px-8 py-12 sm:px-12 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Compass className="h-8 w-8 text-white/70" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-gray-400">
            Error 404
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="max-w-sm text-sm text-gray-400">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black shadow-xl transition-all hover:bg-white/90"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
