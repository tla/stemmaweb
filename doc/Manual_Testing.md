#Manual testing

Note: Make sure between each numbered step to delete
your cookies or start a new private browser window

1) OpenID account creation
    a) reset database to empty / no users - run makedbtest.pl
    b) Navigate to stemmaweb site, click on 'Sign In/Register'
    and click sign in with openID
    c) Enter a valid openID
    d) Verify you're signed in - stemmaweb should tell you
    e) check the database:
        > sqlite3 db/traditions.db
        > select * from entries where class="Text::Tradition::User";
        > Verify your OpenID account is there.
2) OpenID login
    > Logout & Repeat 1) from 1b) to 1d).
3) Brand new google+ account creation
    a) reset database to empty / no users - run makedbtest.pl
    b) Navigate to stemmaweb site, click on 'Sign In/Register'
    and sign in with Google
    c) Verify you're signed in - stemmaweb should tell you
    d) Check the database, similar to 1e)
4) Login to google+ account
    > Repeat 3) from 3b) to 3d)
5) Converting an OpenID to G+ account
    a) `git checkout master`
    b) Navigate to stemmaweb site, click on 'Sign In/Register'
    and sign in with Google
    c) Verify you're signed in - stemmaweb should tell you
    d) Check the database, similar to 1e)
    e) switch back to the g+ login branch
    f) Login with google
    g) Check the database - see that the old user is gone
    and there is one with your g+ id
    h) Log out, and try logging in with G+,
    verify it works.
6) Stemmaweb registration
    a) reset database to empty / no users - run makedbtest.pl
    b) Navigate to stemmaweb site, click on 'Sign In/Register'
    and click sign in with stemmaweb
    c) Click on 'register' and sign up
    d) Verify stemmaweb has logged you in and that your
    username is in the database.
7) Stemmaweb login
    a) Navigate to stemmaweb site, click on 'Sign In/Register'
    and click sign in with stemmaweb
    b) Log in with the username & password you created in 6)
    c) Verify successful log in
