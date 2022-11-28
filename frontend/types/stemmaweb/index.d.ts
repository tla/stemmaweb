/** Type representing a **Tradition** as returned from the Stemmarest API. */
export interface Tradition {
  /** The list of witness sigla belonging to this tradition */
  witnesses: string[];

  /** The direction of the tradition (LR, RL, or BI) */
  direction: string;

  /** Whether the tradition should be viewable by other users */
  is_public: boolean;

  /** The name of the tradition */
  name: string;

  /** The ID of the tradition */
  id: string;

  /** The user ID of the tradition's owner */
  owner: string;

  /** The language of the tradition */
  language: string;
}
/** Type representing a **Stemma** as returned from the Stemmarest API. */
export interface Stemma {
  /** True if this is an undirected tree, rather than a directed stemma. */
  is_undirected: boolean;

  /** True if the stemma indicates witness contamination or conflation. */
  is_contaminated: boolean;

  /** A string that holds the Newick specification of the tree topology. */
  newick: string;

  /** The job ID of the stemma. */
  jobid: number;

  /** A string that holds the dot specification of the stemma or tree topology. */
  dot: string;

  /** The name (identifier) of the stemma. Must be unique within the tradition. */
  identifier: string;
}

/**
 * Possible values to represent a user's role. The `guest` role is not
 * represented explicitly as it is the default role for unauthenticated
 * visitors.
 */
export type UserRole = 'admin' | 'user';

/** Base Data Transfer Object used for authentication-related operations. */
export interface AuthDTO {
  recaptcha_token: string;
}

/** Data Transfer Object to register a user to the system. */
export interface RegisterUserDTO extends AuthDTO {
  passphrase: string;
  role: UserRole;
  id: string;
  active: boolean;
  email: string;
}

/** Data Transfer Object to log a user into the system. */
export interface LoginUserDTO extends AuthDTO {
  id: string;
  passphrase: string;
}
