import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Imágenes sin optimización server-side
  images: {
    unoptimized: true,
  },
  
  // Trailing slash para compatibilidad
  trailingSlash: true,

  allowedDevOrigins: [
    'http://localhost:3003',
    'http://192.168.100.190:3003',
    'http://[2800:300:6f53:6290:bc24:415e:8d6c:b7d7]:3003'
  ],
  outputFileTracingRoot: path.join(__dirname, './'),


  async rewrites() {
    return [
      {
        source: '/',
        has: [{ type: 'header', key: 'x-device-type', value: 'mobile' }],
        destination: '/movil/auto-load-board',
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/movil/',
        destination: '/movil/auto-load-board',
        permanent: false,
      },
    ];
  },


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

export default nextConfig;
