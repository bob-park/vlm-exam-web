import type {NextConfig} from "next";

const apiHost =
    process.env.NEXT_PUBLIC_API_HOST?.replace(/\/+$/, "") ??
    "http://localhost:8000";

const nextConfig: NextConfig = {
    output: 'standalone',
    reactStrictMode: false,
    experimental: {
        proxyClientMaxBodySize: "100gb",
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${apiHost}/:path*`,
            },
        ];
    },
};

export default nextConfig;
