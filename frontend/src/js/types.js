/**
 * Type representing a tradition as returned from the Stemmarest API.
 * @typedef {Object} types.Tradition
 * @property {string[]} witnesses - The list of witness sigla belonging to this tradition
 * @property {string} direction - Direction of the tradition (LR, RL, or BI).
 * @property {boolean} is_public - Whether the tradition should be viewable by other users.
 * @property {string} name - Name of the tradition
 * @property {string} id - The ID of the tradition.
 * @property {string} owner - User ID of the tradition's owner.
 * @property {string} language - Language of the tradition
 */

const types = true;
export { types };
