# some-utilz

Some typescript utils.

This is an update of the previous solution [some-utils](https://github.com/jniac/some-utils)

(former n10-utils)

Compilation of typescript utils, essentially for front-end concerns, essentially:
- React (observables, `useEffects(...)` (multiple effects declared once), etc.)
- ThreeJS (Vertigo Camera, `ShaderForge` (custom shaders), etc.)

Used as a submodule for now, could be turned to a NPM package.

```
git submodule add https://github.com/jniac/some-utilz.git src/some-utilz
```

## tsconfig

### compilerOptions
Actuellement, pour utiliser "some-utils" en tant que submodule dans un projet 
typescript, il est nécessaire d'activer les réglages suivants : 
```js
{
  "compilerOptions": {
    "downlevelIteration": true,   // because iteration is cool (but low perf?)
  }
}
```

### exclude
Certains utilitaires s'appuie sur des modules NPM qui peuvent être absent. 
Il est alors nécessaire d'exclure les ressources concernées.
```js
{
  "include": [
    "src"
  ],
  "exclude": [
    // Exclusion générique
    "src/some-utilz/packages",

    // Exclusion spécifique
    "src/some-utilz/packages/three",
    "src/some-utilz/packages/@react-three"
  ]
}
```
