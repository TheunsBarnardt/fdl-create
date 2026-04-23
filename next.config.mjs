/** @type {import('next').NextConfig} */
const HEAVY_SERVER_PKGS = /^(lighthouse|chrome-launcher|@paulirish\/trace_engine)(\/|$)/;

const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { allowedOrigins: ['localhost:3100'] } },
  serverExternalPackages: ['lighthouse', 'chrome-launcher', '@paulirish/trace_engine'],
  webpack(config, { isServer }) {
    if (isServer) {
      const prev = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(prev) ? prev : [prev]),
        ({ request }, cb) => {
          if (HEAVY_SERVER_PKGS.test(request)) return cb(null, `commonjs ${request}`);
          cb();
        }
      ];
    }
    return config;
  }
};
export default nextConfig;
