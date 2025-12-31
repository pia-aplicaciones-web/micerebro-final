/** @type {import('next').NextConfig} */
const nextConfig = {
  // Imágenes sin optimización server-side
  images: {
    unoptimized: true,
  },
  
  // Trailing slash para compatibilidad
  trailingSlash: true,
  
  // Ignorar errores durante build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuración experimental para chunks
  experimental: {
    // outputFileTracingRoot removido por ser inválido en Next.js 15
  },

  // Webpack config mejorado para evitar problemas de chunks
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Configuración adicional para desarrollo
    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: false,
            vendors: false,
          },
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;
