# Stemmaweb Frontend - Development Guide

## Project Structure

- `scripts/` - Utility scripts written in `node` to automate common tasks
  - `copyVendor` - Copies the vendor files from `node_modules` to `www` so that it can be deployed to a server as a
    standalone folder
  - `serve` - Starts a local web server to serve the `www` folder supporting hot reloading on file changes
- `types/` - Typescript type definitions. While we **DO NOT** use any TypeScript in the project, we do use the type
  definitions with [JSDoc](https://jsdoc.app/) to get better code completion in our IDEs. Files in this folder only help
  the developers at development time and are not included in the bundle (`www`) we ship to the users.
- `www/` - The actual source code of the project written in pure HTML5, CSS and JS. The folder is ready to be deployed
  to any web server as a static site. The `index.html` file is the entry point of the application.

## Local Node Modules

The `package.json` file contains the project metadata and the dependencies. The `package-lock.json` file pins the actual
versions of the dependencies that are installed. The `package-lock.json` file is automatically generated and should not
be edited manually. Distribution files from the node modules installed after `npm install` are copied to `www` by
executing `npm run build`. This step is required only after you add / change a dependency. In this case it is likely
that you also need to edit `scripts/copyVendor` to define the source path under `node_modules` and the destination path
in `www`.

## Code Formatting

In order to have a consistent code style, we use [Prettier](https://prettier.io/) to format the code. The configuration
is defined in `.prettierrc.json`. You should format your code before committing it to the repository by executing
`npm run format`.
