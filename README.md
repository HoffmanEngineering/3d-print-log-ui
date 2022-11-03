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

## Generating a new SSL Cert

Following instructions from (https://medium.com/@rubenvermeulen/running-angular-cli-over-https-with-a-trusted-certificate-4a0d5f92747a),

Requirements
OS X
You should be all set. OS X has by default openssl installed.
Windows 10
Install openssl. I recommend using the Git bash. It has openssl preinstalled. Git Bash is bundled with the Git installer.
https://git-scm.com/
Step 1: Generate a certificate
Clone the following repository on your local machine and run the generate.sh script in either the terminal or Git Bash. The repository contains all necessary configuration for creating a new trusted certificate.
https://github.com/RubenVermeulen/generate-trusted-ssl-certificate
git clone https://github.com/RubenVermeulen/generate-trusted-ssl-certificate.git
cd generate-trusted-ssl-certificate
bash generate.sh
You should now have a server.crt and a server.key file in the repository folder.
Step 2: Install the certificate
We have to make sure the browser trust our certificate, so we’re going to install it on our local machine.
OS X
Double click on the certificate (server.crt)
Select your desired keychain (login should suffice)
Add the certificate
Open Keychain Access if it isn’t already open
Select the keychain you chose earlier
You should see the certificate localhost
Double click on the certificate
Expand Trust
Select the option Always Trust in When using this certificate
Close the certificate window
The certificate is now installed.
Windows 10
Double click on the certificate (server.crt)
Click on the button “Install Certificate …”
Select whether you want to store it on user level or on machine level
Click “Next”
Select “Place all certificates in the following store”
Click “Browse”
Select “Trusted Root Certification Authorities”
Click “Ok”
Click “Next”
Click “Finish”
If you get a prompt, click “Yes”
The certificate is now installed.
Step 3: Configure the application
Now our certificate is ready to be consumed we have to make sure our application uses the correct certificate.
Create a folder ssl in the application folder.
angular-app:

- e2e
- src
- ssl
  .angular-cli.json
  Copy the private key and root certificate from step 1 into the ssl folder. Make sure the file names are like this:
  server.key (private key)
  server.crt (root certificate)
  Before we run our application, make sure you have restarted your browser and updated the start script in package.json.

# Updating Angular

Normally `ng update` is used to update dependencies. The following script is just for copy/paste convenience:

`ng update @angular/cli @angular/core @angular/material @angular/material-moment-adapter @angular/cdk @angular/flex-layout @angular/youtube-player @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest eslint @angular-eslint/builder @angular-eslint/eslint-plugin @angular-eslint/eslint-plugin-template @angular-eslint/schematics @angular-eslint/template-parser @auth0/auth0-spa-js @microsoft/applicationinsights-web karma karma-chrome-launcher karma-coverage karma-jasmine prettier moment jasmine-core lint-staged ngx-toastr @types/jasmine @types/lodash @angular-material-components/datetime-picker @angular-material-components/moment-adapter @cypress/webpack-preprocessor cypress d3 karma-jasmine-html-reporter source-map-explorer`

# Ignoring Largescale Refactors

We can use the ignoreRevsFile feature of git to ignore blames of large-scale refactors:
`git config blame.ignoreRevsFile .git-blame-ignore-revs`
