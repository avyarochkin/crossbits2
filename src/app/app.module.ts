import { BrowserModule } from '@angular/platform-browser'
import { RouteReuseStrategy } from '@angular/router'
import { NgModule } from '@angular/core'
import { IonicModule, IonicRouteStrategy } from '@ionic/angular'

import { GameProvider } from 'src/providers/game/game'
import { LocalStorageProvider } from 'src/providers/local-storage/local-storage'
import { MyApp } from './app.component'
import { AppRoutingModule } from './app-routing.module'

@NgModule({
    declarations: [
        MyApp
    ],
    imports: [
        BrowserModule,
        IonicModule.forRoot(),
        AppRoutingModule
    ],
    bootstrap: [MyApp],
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        GameProvider,
        LocalStorageProvider
    ]
})
export class AppModule {}
