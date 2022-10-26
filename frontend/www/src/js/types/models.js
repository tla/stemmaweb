/**
 * Type representing a **Tradition** as returned from the Stemmarest API.
 *
 * @typedef {Object} models.Tradition
 * @property {string[]} witnesses - The list of witness sigla belonging to this
 *   tradition
 * @property {string} direction - Direction of the tradition (LR, RL, or BI).
 * @property {boolean} is_public - Whether the tradition should be viewable by
 *   other users.
 * @property {string} name - Name of the tradition
 * @property {string} id - The ID of the tradition.
 * @property {string} owner - User ID of the tradition's owner.
 * @property {string} language - Language of the tradition
 */

/**
 * Type representing a **Stemma** as returned from the Stemmarest API.
 *
 * @typedef {Object} models.Stemma
 * @property {boolean} is_undirected - True if this is an undirected tree,
 *   rather than a directed stemma.
 * @property {boolean} is_contaminated - True if the stemma indicates witness
 *   contamination or conflation.
 * @property {string} newick - A string that holds the Newick specification of
 *   the tree topology.
 * @property {number} jobid
 * @property {string} dot - A string that holds the dot specification of the
 *   stemma or tree topology.
 * @property {string} identifier - The name (identifier) of the stemma. Must be
 *   unique within the tradition.
 */
