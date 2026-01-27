/** @type {import('next').NextConfig} */
const nextConfig = {
  // Imágenes sin optimización server-side
  images: {
    unoptimized: true,
  },
  
  // Trailing slash para compatibilidad
  trailingSlash: true,

  allowedDevOrigins: [
    'http://localhost:3002',
    'http://192.168.100.190:3002',
    'http://[2800:300:6f53:6290:bc24:415e:8d6c:b7d7]:3002'
  ],
  outputFileTracingRoot: require('path').join(__dirname, './'),


  // Habilitar detección de errores (mejor práctica)
  // typescript: {
  //   ignoreBuildErrors: false, // default behavior
  // },
  
  // eslint: {
  //   ignoreDuringBuilds: false, // default behavior
  // },
  


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
