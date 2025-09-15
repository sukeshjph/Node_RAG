/**
 * App Module
 * 
 * This is the root module of the Angular application.
 * It imports all necessary modules and declares the root component.
 * 
 * @see https://angular.io/guide/architecture-modules
 */

import { A11yModule } from '@angular/cdk/a11y';
// App Components
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BidiModule } from '@angular/cdk/bidi';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
// Services
import { ChatService } from './services/chat.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';
// CDK Modules
import { LayoutModule } from '@angular/cdk/layout';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
// Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { NgModule } from '@angular/core';
import { ObserversModule } from '@angular/cdk/observers';
import { OverlayModule } from '@angular/cdk/overlay';
import { PlatformModule } from '@angular/cdk/platform';
import { PortalModule } from '@angular/cdk/portal';
import { ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TextFieldModule } from '@angular/cdk/text-field';
import { UploadService } from './services/upload.service';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        // Core Angular modules
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        ReactiveFormsModule,

        // Routing
        AppRoutingModule,

        // Angular Material modules
        MatToolbarModule,
        MatSidenavModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatCardModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatChipsModule,
        MatBadgeModule,
        MatDividerModule,
        MatExpansionModule,
        MatTabsModule,
        MatMenuModule,
        MatDialogModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatSlideToggleModule,
        MatSliderModule,
        MatStepperModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatTreeModule,
        MatAutocompleteModule,
        MatDatepickerModule,
        MatNativeDateModule,

        // CDK modules
        LayoutModule,
        TextFieldModule,
        DragDropModule,
        ScrollingModule,
        PortalModule,
        OverlayModule,
        A11yModule,
        BidiModule,
        ObserversModule,
        PlatformModule
    ],
    providers: [
        // Services
        ChatService,
        UploadService,

        // CDK services
        BreakpointObserver
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
