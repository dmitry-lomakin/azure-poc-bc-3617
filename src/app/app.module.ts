import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import {
    NuiButtonModule,
    NuiFormFieldModule,
    NuiIconModule,
    NuiSelectV2Module,
    NuiSwitchModule,
    NuiTextboxModule,
} from '@nova-ui/bits';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import {
    IPublicClientApplication,
    PublicClientApplication,
    InteractionType,
    BrowserCacheLocation,
    LogLevel,
} from '@azure/msal-browser';
import {
    MsalGuard,
    MsalInterceptor,
    MsalBroadcastService,
    MsalInterceptorConfiguration,
    MsalModule,
    MsalService,
    MSAL_GUARD_CONFIG,
    MSAL_INSTANCE,
    MSAL_INTERCEPTOR_CONFIG,
    MsalGuardConfiguration,
    MsalRedirectComponent,
} from '@azure/msal-angular';
import { CommonModule } from '@angular/common';
import { AzureComponent } from './azure/azure.component';
import { ReactiveFormsModule } from '@angular/forms';

const isIE =
    window.navigator.userAgent.indexOf('MSIE ') > -1 ||
    window.navigator.userAgent.indexOf('Trident/') > -1;

export function loggerCallback(logLevel: LogLevel, message: string) {
    console.log(message);
}

export function MSALInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication({
        auth: {
            clientId: '953830a8-1320-4ad6-8603-aa042d3d76f7',
            authority:
                'https://login.microsoftonline.com/ac62f53a-8154-47ad-ae61-cc9b7273c672',
            redirectUri: 'http://localhost:4200/',
        },
        cache: {
            cacheLocation: BrowserCacheLocation.LocalStorage,
            storeAuthStateInCookie: isIE, // set to true for IE 11
        },
        system: {
            loggerOptions: {
                loggerCallback,
                logLevel: LogLevel.Info,
                piiLoggingEnabled: false,
            },
        },
    });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
    const protectedResourceMap = new Map<string, Array<string>>();
    protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']);
    protectedResourceMap.set('https://management.azure.com/subscriptions', [
        'https://management.azure.com/user_impersonation',
    ]);

    return {
        interactionType: InteractionType.Popup,
        protectedResourceMap,
    };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return {
        interactionType: InteractionType.Popup,
        authRequest: {
            scopes: ['user.read', 'https://management.azure.com/user_impersonation'],
        },
    };
}

@NgModule({
    declarations: [AppComponent, AzureComponent],
    imports: [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        HttpClientModule,
        MsalModule,
        NuiSelectV2Module,
        ReactiveFormsModule,
        NuiFormFieldModule,
        NuiTextboxModule,
        NuiSwitchModule,
        NuiButtonModule,
        NuiIconModule,
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: MsalInterceptor,
            multi: true,
        },
        {
            provide: MSAL_INSTANCE,
            useFactory: MSALInstanceFactory,
        },
        {
            provide: MSAL_GUARD_CONFIG,
            useFactory: MSALGuardConfigFactory,
        },
        {
            provide: MSAL_INTERCEPTOR_CONFIG,
            useFactory: MSALInterceptorConfigFactory,
        },
        MsalService,
        MsalGuard,
        MsalBroadcastService,
    ],
    bootstrap: [AppComponent, MsalRedirectComponent],
})
export class AppModule {}
