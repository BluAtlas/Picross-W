# Picross W


A Multiplayer Cooperative Web Picross game made with Vue and Web Assembly; hosted with Express.

A live version can be played at [https://picross-w.onrender.com/](https://picross-w.onrender.com/)

Created as my Senior Project at Utah Tech University.


## Building

The Web Assembly portion of the project in `/public/out` can be built from [this repository](https://github.com/BluAtlas/Picross-W-WASM).

## Hosting

To host, install [Nodejs and npm](https://nodejs.org/en).

Next install the dependencies with:

```sh
npm install .
```

Assign the environment variable `PORT` to the desired port number, then launch with:

```sh
node index.js
```
