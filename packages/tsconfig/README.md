# @bajigur/tsconfig

Shared TypeScript configuration.

```jsonc
{ "extends": "@bajigur/tsconfig/base.json" }     // Bun services
{ "extends": "@bajigur/tsconfig/library.json" }  // packages/*
{ "extends": "@bajigur/tsconfig/app.json" }      // DOM + JSX apps
```

Next.js apps keep their own generated config.
