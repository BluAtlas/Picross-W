# Picross W

A Multiplayer Cooperative Web Picross game made with Vue and Web Assembly; hosted with Express.

Created as my Senior Project at Utah Tech University.

## Building

The Web Assembly portion of the project in `/public/out` can be built from [this repository](https://github.com/BluAtlas/Picross-W-WASM).

## Hosting

To host, install [Nodejs and npm](https://nodejs.org/en).

Next install the dependencies with:

```sh
npm ci
```

Assign the environment variable `PORT` to the desired port number, then launch with:

```sh
node index.js
```
