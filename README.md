# Tetration Scribe
In place annotation editing extension for Tetration. Requires software version 2.3+

# CLI Commands

## Development

```Shell
npm run watch
```

Starts the watcher for building content script when a file changed.

```Shell
npm run popup
```

Starts the watcher for building popup when a file changed.

## Building

```Shell
npm run build
```

Preps your app for deployment. Minifies all files, piping them to the `src/build` folder.
