# Tests

## Running the tests

The controller tests are integration tests. They drive the Catalyst
application in process, and the application talks to a real Stemmarest
backend, so they have to run inside the development Docker stack:

```
./script/run_tests.sh
```

That starts `docker-compose.dev.yml` if it is not already up, runs the
controller tests, and then runs `t/controller_Routes.t`, which checks that
every route really was exercised. You can also name files explicitly:

```
./script/run_tests.sh t/controller_Root.t
```

To run a single file by hand:

```
docker compose -f docker-compose.dev.yml exec \
    -w /var/www/stemmaweb stemmaweb prove -l t/controller_Root.t
```

The whole suite (not just the controllers) is `prove -l t/` inside the same
container.

## What is covered

`t/controller_*.t` covers every public action of every controller in
`lib/stemmaweb/controller/`, with the exception of `Stexaminer.pm`, which is
out of commission and is tested by nothing.

| File | Controller |
| --- | --- |
| `t/controller_Root.t` | `Root.pm` - pages, the directory, tradition and section metadata, uploads, ordering, deletion, downloads, the API pass-through |
| `t/controller_Stemma.t` | `Stemma.pm` - reading, creating, updating, rerooting and deleting stemmata |
| `t/controller_Relation.t` | `Relation.pm` - the relationship mapper, readings, relationships, relation types, emendations and the reading-editing operations |
| `t/controller_Stemweb.t` | `Stemweb.pm` - the client for the external Stemweb service, driven against a fake Stemweb |
| `t/controller_Users.t` | `Users.pm` - sign in, sign out, registration and the password routes |
| `t/controller_Util.t` | `Util.pm` - the helpers shared by the controllers (it answers no URLs) |
| `t/controller_Routes.t` | the route inventory, and the dispatch-coverage assertion |

Each file records the behaviour of the application as it is. Where an endpoint
is known to be broken, the expectation that it should work is written as a
`TODO` test with the reason, so that it is reported without failing the run.

## Test data

`stemmaweb::Test::DB::new_db` wipes and recreates the fixture data in
Stemmarest. `stemmaweb::Test::App::new_fixtures` calls it and then returns
*names* for the six fixture traditions, so that the tests do not depend on the
order in which they are created:

| Key | Tradition | Owner | Access for `user@example.org` |
| --- | --- | --- | --- |
| `private_owned` | Notre besoin | user | full (has a stemma) |
| `public_readonly` | Florilegium | admin | read only (has a stemma) |
| `public_owned` | Sapientia | user | full |
| `public_john` | John verse | user | full |
| `private_rtl` | RTL test | user | full |
| `multisection` | section test | user | full (two sections) |

Other helpers in `t/lib/stemmaweb/Test/App.pm`:

* `login_mech` - a mechanize object with a session for `user@example.org`.
* `get_req`, `post_form`, `post_json`, `put_form`, `delete_req` and friends -
  request builders. `HTTP::Request::Common` only treats the argument directly
  after the URL as request content, so building requests by hand is easy to get
  wrong; these always put it in the right place.
* `body_of` - the raw response body. Do not use `decoded_content` on the CSV,
  TSV or SVG views: they set `Content-Encoding: UTF-8`, which makes it return
  undef.
* `with_config` - set an application configuration value for the duration of a
  block (used to turn the reCaptcha requirement off for the registration
  tests).

## Coverage

`t/controller_Routes.t` does two things. First it pins down the inventory of
public actions belonging to the controllers under test, so that a route that
appears or disappears is noticed. Second, if `STEMMAWEB_ACTION_LOG` names a
file, it checks that the suite dispatched every one of those actions -
`script/run_tests.sh` provides the log.

Two actions are recorded there as unreachable, with the reason: the
authentication store cannot resolve the user lookup that the
`/auth/<id>/change-password` chain starts with, and nothing is chained from
`Users::authenticated`.

## Known defects recorded by the tests

These are pre-existing problems in the controller layer that this suite
documents rather than fixes. They show up as TODO tests.

1. `Stemma::index` calls `_as_svg()`, which the package never imports, so
   `GET /stemma/<tradition>/<stemma>` is a 500 unless the client sends
   `Accept: application/json`. `Stemma::dot` has the same problem with
   `_json_error()` on its error path.
2. `Root::textinfo` sets `is_public` to false when the posted form does not
   carry it, so renaming a tradition silently un-publishes it.
3. Several actions call `json_error(...)` and then carry on, because there is
   no `return`. The status is correct (403, 405, ...) but the work is still
   done: a refused write can still change the data, and a refused read still
   puts the payload in the body. `Root::variantgraph`, `Root::download`,
   `Stemma::index` and `Stemma::dot` leak data this way, and `Relation`'s
   permission checks for readings, compresses, merges, duplicates, splits,
   emends and relation types still perform the write.
4. The templates `auth/forgot-password.tt` and `reset-password-plain.tt` are
   not shipped, so the two password-recovery routes answer 500 whenever they
   try to render.

## Notes on the other test files

* `t/04login.t` and `t/05register.t` cover the sign-in and registration forms
  in more detail than `t/controller_Users.t` does. They submit their forms by
  field rather than by form number, and they no longer rely on
  `stemmaweb_tests.conf` (ConfigLoader ignores the local-suffix files once
  `STEMMAWEB_CONFIG` names a config file, which is what happens inside the
  container).
* `t/model_Stemma.t` tested `Text::Tradition::Stemma`, which the application
  no longer uses; it now tests `stemmaweb::Model::Stemma`.
* `t/06openid.t` and `t/07google.t` skip themselves: those login routes are no
  longer implemented.
