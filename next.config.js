/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "@libsql/isomorphic-fetch",
    "@libsql/hrana-client",
    "@libsql/core",
    "libsql",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.fifa.com",
        pathname: "/api/v3/picture/**",
      },
      {
        protocol: "https",
        hostname: "crests.football-data.org",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
};

export default config;
