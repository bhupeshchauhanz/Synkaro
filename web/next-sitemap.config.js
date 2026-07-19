/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://synkaro.bhupeshchauhan.in',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/room/', '/api/'] }],
  },
  exclude: ['/dashboard', '/room/*', '/api/*', '/auth/verify'],
};
