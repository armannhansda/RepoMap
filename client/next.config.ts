import type { NextConfig } from "next";
import path from "path";

const isVSCode = process.env.BUILD_TARGET === 'vscode';

const nextConfig: NextConfig = {
  /* config options here */
  ...(isVSCode && { output: "export" }),
  ...(isVSCode && { images: { unoptimized: true } }),
  reactCompiler: true,
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
