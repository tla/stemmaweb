# Stemmaweb Frontend

This module holds the source code for the web interface of Stemmaweb.

## Start the App Locally

All the needed dependencies and the source code are bundled in the `www` directory, meaning that it just needs to be
served by an HTTP server. You can either use an HTTP server of your choice or use the one we in this repository. To use
the node server we provide, you need to install the development dependencies and run the server via the commands below:

```shell
npm install --only=dev
npm run serve
```

The app will be available at [http://127.0.0.1:5000](http://127.0.0.1:5000).

Please note that this will only start the frontend. You will need to start the middleware and the backend as well.

## The Used Stack

This project is purposefully being built using VanillaJS and pure HTML/CSS without any build tools or frameworks. The
main goal we are trying to achieve with this is to keep the project as accessible as possible for new contributors and
for curious people who want to peek under the hood when they are using the app. Afterall, Stemmaweb is a piece of
scientific software that should be as transparent as possible.

If you would like to know more about the details of the frontend implementation details, please refer
to [DEVELOPMENT.md](./DEVELOPMENT.md).
