import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MsalService } from '@azure/msal-angular';

import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-azure',
    templateUrl: './azure.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AzureComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();

    private azureInteractionComplete = false;

    // https://management.azure.com/subscriptions?api-version=2020-01-01
    subscriptions$ = new BehaviorSubject<Record<string, string>>({});

    selectedSubscriptionId$ = new BehaviorSubject<string>('');

    // https://management.azure.com/subscriptions/${subscriptions.value[0].subscriptionId}/resourcegroups?api-version=2021-04-01
    resourceGroups$ = new BehaviorSubject<string[]>([]);

    selectedResourceGroupName$ = new BehaviorSubject<string>('');

    // https://management.azure.com/subscriptions/${subscriptions.value[0].subscriptionId}/providers/Microsoft.Web/geoRegions?api-version=2021-02-01
    regions$ = new BehaviorSubject<string[]>([]);

    selectedRegion$ = new BehaviorSubject<string>('');

    // https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.Compute/locations/{location}/vmSizes?api-version=2022-03-01
    availableSizes$ = new BehaviorSubject<string[]>([]);

    // https://docs.microsoft.com/en-us/rest/api/compute/disks/create-or-update?tabs=HTTP#diskstorageaccounttypes
    osDiskTypes = [
        {
            id: 'Premium_LRS',
            label: 'Premium SSD',
            description: 'Best for production and performance sensitive workloads',
        },
        {
            id: 'StandardSSD_LRS',
            label: 'Standard SSD',
            description: 'Best for web servers, lightly used enterprise applications and dev/test',
        },
        {
            id: 'Standard_LRS',
            label: 'Standard HDD',
            description: 'Best for backup, non-critical, and infrequent access',
        },
        {
            id: 'UltraSSD_LRS',
            label: 'Ultra SSD',
            description: 'Best for IO-intensive workloads such as SAP HANA, top tier databases (for example, SQL, Oracle), and other transaction-heavy workloads',
        },
        // Premium_ZRS
        // string
        // Premium SSD zone redundant storage. Best for the production workloads that need storage resiliency against zone failures.

        // StandardSSD_ZRS
        // string
        // Standard SSD zone redundant storage. Best for web servers, lightly used enterprise applications and dev/test that need
        // storage resiliency against zone failures.
    ];

    // https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks?api-version=2021-08-01
    virtualNetworks$ = new BehaviorSubject<string[]>([]);

    settingsForm: FormGroup;

    constructor(
        private readonly http: HttpClient,
        private readonly fb: FormBuilder,
        private readonly authService: MsalService,
    ) {
        this.settingsForm = this.fb.group({
            subscriptionId: [''],
            resourceGroupName: [''],
            virtualMachineName: ['', [Validators.required]],
            region: [''],
            vmSize: [''],
            osDiskType: [this.osDiskTypes[0].id],
            virtualNetwork: [''],
            subnet: [''],
            enableRemoteDesktop: [false],
        });

        this.settingsForm.controls.region.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(region => this.selectedRegion$.next(region));
    }

    ngOnInit(): void {
        this.authService.instance.addEventCallback(({ eventType }: { eventType: string }) => {
            if (['msal:acquireTokenSuccess', 'msal:loginSuccess'].includes(eventType)) {
                this.executeAzureInteraction();
            }
        });
        if (this.authService.instance.getAllAccounts().length > 0) {
            this.executeAzureInteraction();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    refreshSubscriptions(): void {
        this.http.get('https://management.azure.com/subscriptions?api-version=2020-01-01')
            .subscribe((subscriptions: any) => {
                const allSubscriptions = subscriptions.value.reduce((acc: Record<string, string>, { subscriptionId, displayName }: any) => {
                    acc[subscriptionId] = displayName;

                    return acc;
                }, {});
                const allSubscriptionIds = Object.keys(allSubscriptions);
                this.subscriptions$.next(allSubscriptions);
                if (allSubscriptionIds.length) {
                    this.selectedSubscriptionId$.next(allSubscriptionIds[0]);
                }
            });
    }

    refreshResourceGroups(subscriptionId: string): void {
        this.http.get(`https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`)
            .subscribe((resourceGroups: any) => {
                const allResourceGroups = resourceGroups.value.map(({ name }: any) => name);
                this.resourceGroups$.next(allResourceGroups);
                if (allResourceGroups.length) {
                    this.selectedResourceGroupName$.next(allResourceGroups[allResourceGroups.length - 1]);
                }
            });
    }

    refreshRegions(subscriptionId: string): void {
        this.http.get(`https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web/geoRegions?api-version=2021-02-01`)
            .subscribe((regions: any) => {
                const allRegions = regions.value.map(({ name }: any) => name);
                this.regions$.next(allRegions);
                if (allRegions.length) {
                    this.settingsForm.patchValue({ region: allRegions[0] });
                    this.selectedRegion$.next(allRegions[0]);
                }
            });
    }

    refreshAvailableSizes(subscriptionId: string, location: string): void {
        this.http.get(`https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/locations/${location}/vmSizes?api-version=2022-03-01`)
            .subscribe((availableSizes: any) => {
                const allAvailableSizes = availableSizes.value.map(({ name }: any) => name);
                this.availableSizes$.next(allAvailableSizes);
                if (allAvailableSizes.length) {
                    this.settingsForm.patchValue({ vmSize: allAvailableSizes[0] });
                }
            });
    }

    refreshVirtualNetworks(subscriptionId: string, resourceGroupName: string): void {
        this.http.get(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Network/virtualNetworks?api-version=2021-08-01`)
            .subscribe((virtualNetworks: any) => {
                const allVirtualNetworks = virtualNetworks.value.map(({ name }: any) => name);
                this.virtualNetworks$.next(allVirtualNetworks);
                if (allVirtualNetworks.length) {
                    this.settingsForm.patchValue({ virtualNetwork: allVirtualNetworks[0] });
                }
            });
    }

    private executeAzureInteraction(): void {
        if (this.azureInteractionComplete) {
            return;
        }

        this.refreshSubscriptions();

        this.selectedSubscriptionId$.pipe(takeUntil(this.destroy$))
            .pipe(
                filter(subscriptionId => !!subscriptionId),
                takeUntil(this.destroy$),
            )
            .subscribe(subscriptionId => {
                this.refreshResourceGroups(subscriptionId);
                this.refreshRegions(subscriptionId);
                this.settingsForm.patchValue({ subscriptionId });
            });

        combineLatest([this.selectedSubscriptionId$, this.selectedResourceGroupName$])
            .pipe(
                filter(([subscriptionId, resourceGroupName]) => !!(subscriptionId && resourceGroupName)),
                takeUntil(this.destroy$),
            )
            .subscribe(([subscriptionId, resourceGroupName]) => {
                // this.refreshAvailabilitySets(subscriptionId, resourceGroupName);
                this.refreshVirtualNetworks(subscriptionId, resourceGroupName);
                this.settingsForm.patchValue({ resourceGroupName });
            });

        combineLatest([this.selectedSubscriptionId$, this.selectedRegion$])
            .pipe(
                filter(([subscriptionId, region]) => !!(subscriptionId && region)),
                takeUntil(this.destroy$),
            )
            .subscribe(([subscriptionId, region]) => {
                this.refreshAvailableSizes(subscriptionId, region);
            });

        this.azureInteractionComplete = true;
    }
}
