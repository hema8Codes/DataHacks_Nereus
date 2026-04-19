/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  transpilePackages: ["three-globe", "react-globe.gl", "globe.gl"],
  webpack: (config) => {
    // three-globe references optional subpaths that don't exist in three@0.166
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "three/webgpu": false,
      "three/tsl": false,
    };
    return config;
  },
};
export default nextConfig;
