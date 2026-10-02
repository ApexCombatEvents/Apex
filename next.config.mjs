/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    // AVIF first: better fidelity than WebP at the same file size, which
    // matters most for photos shown small, where compression artefacts read
    // as blur. Next falls back to WebP for browsers that cannot take AVIF.
    formats: ['image/avif', 'image/webp'],
  }
}
export default nextConfig
