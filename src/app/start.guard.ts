import { Injectable } from '@angular/core'
import { CanActivate, GuardResult, Router } from '@angular/router'

import { COLOR_MODE, QUERY_PARAMS, SettingsProvider } from '../providers/settings/settings'

@Injectable()
export class StartGuard implements CanActivate {
    constructor(
        private readonly settings: SettingsProvider,
        private readonly router: Router
    ) { }

    canActivate(): GuardResult {
        const prerequisites = [
            this.settings.getColorMode() == null ? COLOR_MODE : null,
        ].filter(item => item != null)

        return prerequisites.length > 0
            ? this.router.parseUrl(`/${prerequisites[0]}?${QUERY_PARAMS.INITIAL}=true`)
            : true
    }
}