/**
 * Main Entry Point
 * 
 * This is the main entry point for the Angular application.
 * It bootstraps the AppModule and sets up the application.
 * 
 * @see https://angular.io/guide/bootstrapping
 */

import { AppModule } from './app/app.module';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// Bootstrap the application
platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .catch(err => console.error('Error bootstrapping application:', err));
