
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'anikai.to',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.anikai.to',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'asuracomic.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gg.asuracomic.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.anikai.to',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https' ,
        hostname: 'static.aniapi.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'uploads.mangadex.org',
        port: '',
        pathname: '/**',
      }
    ],
  },
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that can cause build issues on edge
    config.resolve.alias = {
        ...config.resolve.alias,
        'aws-crt': false,
        'mock-aws-s3': false,
        'nock': false,
        'socks': false,
        'snappy': false,
        '@mongodb-js/zstd': false,
        '@aws-sdk/credential-providers': false,
        'gcp-metadata': false,
        'kerberos': false,
        'mongodb-client-encryption': false,
    };
    return config;
  },
};

export default nextConfig;
