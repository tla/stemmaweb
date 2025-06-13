/**
 * Simple user check.
 * Checks if the current user is owner of the current 
 * tradition, or if the user's role is admin.
 * 
 * @returns {boolean} If the current user is the owner (or admin): `true`, else `false`.
 */
function userIsOwner() {
    const tradition = TRADITION_STORE.state.selectedTradition;
    const user = AUTH_STORE.state.user;
    const traditionPresent = tradition ? true : false;
    const userPresent = user ? true : false;
    return traditionPresent && userPresent && ( user.id == tradition.owner || user.role == 'admin' );
}

/**
 * Simple admin check.
 *  
 * @returns {boolean} If the current user's role is admin: `true` else `false`.
 */
function userIsAdmin() {
    const tradition = TRADITION_STORE.state.selectedTradition;
    const user = AUTH_STORE.state.user;
    const traditionPresent = tradition ? true : false;
    const userPresent = user ? true : false;
    return traditionPresent && userPresent && ( user.role == 'admin' );
}

function userIsLoggedIn() {
    return AUTH_STORE.state.user != null;
}

