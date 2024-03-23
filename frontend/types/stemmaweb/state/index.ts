import { RegisterUserDTO, Stemma, Tradition } from '../index';

/** Model to represent a user in the system. */
export type StemmawebUser = Omit<RegisterUserDTO, 'recaptcha_token'>;

/** Type to represent an in-app user without sensitive information. */
export type StemmawebUserState = Omit<StemmawebUser, 'passphrase'>;

/** Model to represent the in-app state of a user. */
export type AuthState = {
  user: StemmawebUserState | null;
};

/** Model to represent the in-app state of a Tradition selection. */
export type TraditionState = {
  availableTraditions: Tradition[];
  selectedTradition: Tradition | null;
};

/** Model to represent the in-app state of a Stemma selection. */
export type StemmaState = {
  tradition: Tradition | null;
  availableStemmata: Stemma[];
  selectedStemma: Stemma | null;
};
