import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'

import { BoardPage } from './board.page'
import { IonicModule } from '@ionic/angular'
import { CommonModule } from '@angular/common'
import { GameBoardCanvasComponent } from 'src/components/board-canvas/game-board-canvas'
import { ZoomableDirective } from 'src/directives/zoomable/zoomable'
import { SetupBoardCanvasComponent } from 'src/components/board-canvas/setup-board-canvas'
import { BoardGridComponent } from 'src/components/board-grid/board-grid'

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
        BoardGridComponent,
        ZoomableDirective
    ],
    exports: [RouterModule]
})
export class BoardPageModule {}