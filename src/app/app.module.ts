import { BrowserModule } from '@angular/platform-browser'
import { ErrorHandler, NgModule } from '@angular/core'
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'

import { MyApp } from './app.component'
import { BoardListPage } from '../pages/board-list/page-board-list'
import { BoardPage } from '../pages/board/page-board'

import { GameProvider } from '../providers/game/game'
import { LocalStorageProvider } from '../providers/local-storage/local-storage'

@NgModule({
  declarations: [
    MyApp,
    BoardListPage,
    BoardPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    BoardListPage,
    BoardPage
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
