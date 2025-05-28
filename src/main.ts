import { isDevMode } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { provideRouter, RouteReuseStrategy, Routes } from '@angular/router'
import { provideServiceWorker } from '@angular/service-worker'
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone'

import { MyApp } from './app/app.component'
import { GameGuard } from './app/game.guard'
import { GameProvider } from './providers/game/game'
import { LocalStorageProvider } from './providers/local-storage/local-storage'

// import { environment } from './environments/environment'

// if (environment.production) {
//   enableProdMode()
// }

const ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('src/pages/board-list/board-list.page')
            .then(m => m.BoardListPage)
    },
    {
        path: 'board',
        providers: [GameGuard],
        canActivate: [GameGuard],
        loadComponent: () => import('src/pages/board/board.page')
            .then(m => m.BoardPage)
    }
]

bootstrapApplication(MyApp, {
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideIonicAngular(),
        provideRouter(ROUTES),
        GameProvider,
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        LocalStorageProvider
    ],
}).catch(err => console.error(err))
