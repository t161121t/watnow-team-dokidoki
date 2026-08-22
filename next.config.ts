import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // フレームワーク種別を外部に漏らさない（x-powered-byヘッダーを消す）。
  poweredByHeader: false,
};

export default nextConfig;
