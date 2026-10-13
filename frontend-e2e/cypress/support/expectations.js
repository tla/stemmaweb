// What each role is entitled to see and do, derived from the seed data in
// fixtures/test_traditions_mini.json. Specs compare the UI against these rules
// rather than re-deriving them, so a rule change is made in one place.
// A guest is represented by `null`.

const byTitle = (a, b) => a.title.localeCompare(b.title);

export const roleOf = (user) => (user ? user.role : 'guest');

export const canSee = (user, tradition) =>
  tradition.access === 'Public' ||
  roleOf(user) === 'admin' ||
  tradition.owner === user?.username;

// Editing properties, deleting, running Stemweb and editing the collation share one rule (#317, #332)
export const canModify = (user, tradition) =>
  roleOf(user) === 'admin' ||
  (roleOf(user) === 'user' && tradition.owner === user.username);

// Everyone may open the collation; only those who can modify get the editing view.
export const collationButtonLabel = (user, tradition) =>
  canModify(user, tradition) ? 'Edit Collation' : 'View Collation';

export const canUpload = (user) => roleOf(user) !== 'guest';

export const SEPARATOR = '---';

/**
 * The tradition list as it should render: own traditions alphabetically, then a
 * separator (only when the user owns any), then the rest alphabetically.
 */
export function expectedTraditionList(user, traditions) {
  const visible = traditions.filter((t) => canSee(user, t));
  const own = visible.filter((t) => user && t.owner === user.username);
  const others = visible.filter((t) => !own.includes(t));
  const titles = (list) => [...list].sort(byTitle).map((t) => t.title);
  return [...titles(own), ...(own.length ? [SEPARATOR] : []), ...titles(others)];
}
