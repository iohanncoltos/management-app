import type { NextConfig } from "next";

const onlyOfficeUrl = process.env.ONLYOFFICE_BASE_URL ?? "";
const r2PublicUrl = process.env.R2_PUBLIC_BASE_URL ?? "";
const r2Origin = r2PublicUrl.replace(/\/[^/]*$/, "");
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL ?? "";
const isDev = process.env.NODE_ENV !== "production";

const connectSrc = ["'self'", onlyOfficeUrl, upstashUrl, r2Origin].filter(Boolean).join(" ");
const frameSrc = ["'self'", onlyOfficeUrl].filter(Boolean).join(" ");
const imgSrc = ["'self'", "data:", "blob:", r2Origin].filter(Boolean).join(" ");
const scriptSrcValues = ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"];

if (onlyOfficeUrl) {
  scriptSrcValues.push(onlyOfficeUrl);
}

if (isDev) {
  scriptSrcValues.push("'unsafe-eval'");
}

const scriptSrc = scriptSrcValues.join(" ");

const csp = [
  "default-src 'self'",
  `connect-src ${connectSrc}`,
  `frame-src ${frameSrc}`,
  `img-src ${imgSrc}`,
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
].join("; ");

const baseHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const prodHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...baseHeaders,
];

const devHeaders = baseHeaders;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const headers = isDev ? devHeaders : prodHeaders;
    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
