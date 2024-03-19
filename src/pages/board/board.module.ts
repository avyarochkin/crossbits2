import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'

import { BoardPage } from './board.page'
import { IonicModule } from '@ionic/angular'
import { CommonModule } from '@angular/common'
import { GameBoardCanvasComponent } from 'src/components/board-canvas/game-board-canvas'
import { ZoomableDirective } from 'src/directives/zoomable/zoomable'
import { SetupBoardCanvasComponent } from 'src/components/board-canvas/setup-board-canvas'

@NgModule({
    imports: [
        IonicModule,
        CommonModule,
        RouterModule.forChild([{ path: '', component: BoardPage }])
    ],
    declarations: [
        BoardPage,
        GameBoardCanvasComponent,
        SetupBoardCanvasComponent,
        ZoomableDirective
    ],
    exports: [RouterModule]
})
export class BoardPageModule {}