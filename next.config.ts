import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Origens extras autorizadas em desenvolvimento (acesso pela rede local).
 * Configure `DEV_ALLOWED_ORIGINS=192.168.1.15,meu-notebook.local` no `.env`.
 * O Next.js compara strings exatas — não existem wildcards/CIDR aqui.
 */
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

/**
 * CSP sem nonce para preservar ISR/cache das páginas públicas.
 * `'unsafe-inline'` em scripts é exigido pelos scripts de bootstrap do Next.js
 * quando não se usa nonce; a alternativa com nonce obriga renderização dinâmica
 * em todo o site. O trade-off está documentado em docs/SECURITY.md.
 * `img-src https:` mantém o suporte a imagens hospedadas no Vercel Blob.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS só faz sentido em HTTPS. Sem `includeSubDomains`/`preload` por padrão:
  // só habilite depois de confirmar que todos os subdomínios usam HTTPS.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
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
