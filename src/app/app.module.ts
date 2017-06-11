import { BrowserModule } from '@angular/platform-browser'
import { ErrorHandler, NgModule } from '@angular/core'
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'

import { MyApp } from './app.component'
import { BoardListPage } from '../pages/board-list/page-board-list'
import { BoardSizePage } from '../pages/board-size/page-board-size'
import { BoardPage } from '../pages/board/page-board'
import { HintPadPage } from '../pages/hint-pad/page-hint-pad'

import { GameProvider } from '../providers/game/game'
import { LocalStorageProvider } from '../providers/local-storage/local-storage'
import { NumPickerComponent } from '../components/num-picker/num-picker'
import { ZoomerComponent } from '../components/zoomer/zoomer'
import { BoardCanvasComponent } from '../components/board-canvas/board-canvas'

@NgModule({
    declarations: [
        MyApp,
        BoardListPage,
        BoardSizePage,
        BoardPage,
        HintPadPage,
        NumPickerComponent,
        ZoomerComponent,
    BoardCanvasComponent
    ],
    imports: [
        BrowserModule,
        IonicModule.forRoot(MyApp)
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        BoardListPage,
        BoardSizePage,
        BoardPage,
        HintPadPage
    ],
    providers: [
        StatusBar,
        SplashScreen,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        GameProvider,
        LocalStorageProvider
    ]
})
export class AppModule {}
