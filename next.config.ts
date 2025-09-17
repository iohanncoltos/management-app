import type { NextConfig } from "next";

const onlyOfficeUrl = process.env.ONLYOFFICE_BASE_URL ?? "";
const r2PublicUrl = process.env.R2_PUBLIC_BASE_URL ?? "";
const r2Origin = r2PublicUrl.replace(/\/[^/]*$/, "");

const csp = [
  "default-src 'self'",
  `connect-src 'self' ${onlyOfficeUrl} ${process.env.UPSTASH_REDIS_REST_URL ?? ''} ${r2Origin}`,
  `frame-src 'self' ${onlyOfficeUrl}`,
  `img-src 'self' data: blob: ${r2Origin}`,
  `script-src 'self' 'unsafe-inline' ${onlyOfficeUrl}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
].join('; ');

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
