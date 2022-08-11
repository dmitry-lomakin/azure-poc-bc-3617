import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AzureComponent } from './azure/azure.component';

const routes: Routes = [
    {
        path: '',
        component: AzureComponent,
    },
    {
        path: 'error',
        component: AzureComponent,
    }
];

const isIframe = window !== window.parent && !window.opener;

@NgModule({
    imports: [RouterModule.forRoot(routes, {
        useHash: true,
        // Don't perform initial navigation in iframes
        initialNavigation: !isIframe ? 'enabled' : 'disabled'
    })],
    exports: [RouterModule]
})
export class AppRoutingModule {}
