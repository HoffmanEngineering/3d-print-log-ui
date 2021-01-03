# PrintLogUi

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.5.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

We use Cypress for the E2E tests

Before we can run them, we need to create a local cypress.env.json, following:
https://auth0.com/blog/end-to-end-testing-with-cypress-and-auth0/

## Updating Cura's list of default printers.

We have a nifty utility function to auto-generate the json file containing Cura's default printers. You point it at a local Cura repo, and it'll read through the printer definition files and generate the list of printers.

You can run it by:
`npm run parse-cura`

After, copy the json from `cura-machine-def-parser/out/printers.json` and replace the `const printers= {...}` in `src/printer/printer-detail/cura-exported-printers.ts` with the new defaults.

## Creating a hash

To manually create a hash (for example, for homepage images), you can use the following powershell utility, which outputs an MD5 hash

```
CertUtil -hashfile .\3d_brand_logo.svg MD5
```

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
