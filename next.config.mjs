/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
    POSEIDON_VISITOR_ID: process.env.POSEIDON_VISITOR_ID || '',
    SEREIA_VISITOR_ID: process.env.SEREIA_VISITOR_ID || '',
  },
}

export default nextConfig
