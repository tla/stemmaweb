/**
 * @type {string}
 */
const CY_STEMMAWEB_FRONTEND_URL =
  process.env.CY_STEMMAWEB_FRONTEND_URL || 'http://localhost:8888/stemmaweb';

/**
 * @type {string}
 */
const CY_STEMMAWEB_MIDDLEWARE_URL =
  process.env.CY_STEMMAWEB_MIDDLEWARE_URL ||
  'http://localhost:8888/stemmaweb/requests';

module.exports = {
  CY_STEMMAWEB_FRONTEND_URL,
  CY_STEMMAWEB_MIDDLEWARE_URL
};
