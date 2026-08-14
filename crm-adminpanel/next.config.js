/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The CRM talks to vtmarkets purely over HTTP from server-side route handlers,
  // so no rewrites/proxying config is required here.
};

module.exports = nextConfig;
