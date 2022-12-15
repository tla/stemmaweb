/**
 * @type {string}
 */
const STEMMAWEB_FRONTEND_URL =
  process.env.STEMMAWEB_FRONTEND_URL || 'http://localhost:8888/stemmaweb';

/**
 * @type {string}
 */
const STEMMAWEB_MIDDLEWARE_URL =
  process.env.STEMMAWEB_MIDDLEWARE_URL ||
  'http://localhost:8888/stemmaweb/requests';

module.exports = {
  STEMMAWEB_FRONTEND_URL,
  STEMMAWEB_MIDDLEWARE_URL
};
