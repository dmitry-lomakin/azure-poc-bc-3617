import { HttpClient } from '@angular/common/http';
import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { AuthenticationResult, InteractionStatus, InteractionType, PopupRequest, RedirectRequest } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { environment } from '../environments/environment';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
    isIframe = false;

    loginDisplay = false;

    profile: {
        displayName?: string,
    } = {};

    private readonly _destroying$ = new Subject<void>();

    constructor(
        @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
        private authService: MsalService,
        private msalBroadcastService: MsalBroadcastService,
        private readonly http: HttpClient,
    ) {}

    ngOnInit(): void {
        this.isIframe = window !== window.parent && !window.opener;

        this.msalBroadcastService.inProgress$
            .pipe(
                filter((status: InteractionStatus) => status === InteractionStatus.None),
                takeUntil(this._destroying$)
            )
            .subscribe(() => {
                this.setLoginDisplay();
            });
    }

    setLoginDisplay() {
        this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
        if (this.loginDisplay) {
            this.getProfile();
        }
    }

    login() {
        if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
            if (this.msalGuardConfig.authRequest) {
                this.authService.loginPopup({ ...this.msalGuardConfig.authRequest } as PopupRequest)
                    .subscribe((response: AuthenticationResult) => {
                        this.authService.instance.setActiveAccount(response.account);
                    });
            } else {
                this.authService.loginPopup()
                    .subscribe((response: AuthenticationResult) => {
                        this.authService.instance.setActiveAccount(response.account);
                    });
            }
        } else {
            if (this.msalGuardConfig.authRequest) {
                this.authService.loginRedirect({ ...this.msalGuardConfig.authRequest } as RedirectRequest);
            } else {
                this.authService.loginRedirect();
            }
        }
    }

    logout() {
        const appIndexUrl = environment.production ? '/azure-poc-bc-3617/' : '/';

        if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
            this.authService.logoutPopup({
                postLogoutRedirectUri: appIndexUrl,
                mainWindowRedirectUri: appIndexUrl
            });
        } else {
            this.authService.logoutRedirect({
                postLogoutRedirectUri: appIndexUrl,
            });
        }
    }

    getProfile(): void {
        this.http.get('https://graph.microsoft.com/v1.0/me')
            .subscribe(profile => {
                this.profile = profile;
            });
      }

    ngOnDestroy(): void {
        this._destroying$.next(undefined);
        this._destroying$.complete();
    }
}
