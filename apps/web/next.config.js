/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@vael/sdk"],
  images: {
    domains: ["ipfs.io", "gateway.pinata.cloud"],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOMNIA_RPC: process.env.NEXT_PUBLIC_SOMNIA_RPC,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_VAEL_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_VAEL_REGISTRY_ADDRESS,
    NEXT_PUBLIC_VAEL_PASSPORT_ADDRESS: process.env.NEXT_PUBLIC_VAEL_PASSPORT_ADDRESS,
  },
};

module.exports = nextConfig;
