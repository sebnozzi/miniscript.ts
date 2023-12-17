
# MiniScript.TS

A MiniScript implementation written in TypeScript.

Works in the browser or on Node.js.

At the moment this project is not published either in a CDN for browser consumption nor as an NPM package to be used in Node.js. You will have to build locally.

## Building

You need to have Node.js installed in order to build the project. Version 19 or greater is recommended.

Start by installing all needed packages:

```
npm install
```

Then build with:

```
npm run build
```

This will create a `dist` folder with the following files:

* `miniscript-ts.mjs`: ECMAScript module for Node.js
* `miniscript-ts.js`: [IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE#the_module_pattern) file for the browser
* `miniscript-ts.d.ts`: TypeScript types
* `miniscript-ts.cjs`: CommonJS module, should you need it
* Map-files for each module type

## Usage on the browser

Consult the [examples/browser](examples/browser/) folder.

Note that you will need to build locally for the examples to work.

You will also need a local file-server if you want to open the examples on the browser.

## Usage on Node.js

Consult the [examples/nodejs](examples/browser/) folder.

Note that you will need to build locally for the examples to work.

## Acknowledgements

Many thanks to the amazing MiniScript community at Discord, for their encouragement during the development of this project.

Special thanks go to Joe Strout, author and creator of the MiniScript language and the Mini Micro programming environment. Without his generous help this project would not have been possible.