/**
 * Simple user check.
 * Checks if the current user is owner of the current tradition.
 * 
 * @returns {boolean} If the current user is the owner: `true`, else `false`.
 */
function userIsOwner() {
    const tradition = TRADITION_STORE.state.selectedTradition;
    const user = AUTH_STORE.state.user;
    const traditionPresent = tradition ? true : false;
    const userPresent = user ? true : false;
    return traditionPresent && userPresent && ( user.id == tradition.owner );
}

function userIsLoggedIn() {
    return AUTH_STORE.state.user != null;
}

