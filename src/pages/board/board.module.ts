import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'

import { BoardPage } from './board.page'
import { IonicModule } from '@ionic/angular'
import { CommonModule } from '@angular/common'
import { BoardCanvasComponent } from 'src/components/board-canvas/board-canvas'
import { ZoomableDirective } from 'src/directives/zoomable/zoomable'

@NgModule({
    imports: [
        IonicModule,
        CommonModule,
        RouterModule.forChild([{ path: '', component: BoardPage }])
    ],
    declarations: [BoardPage, BoardCanvasComponent, ZoomableDirective],
    exports: [RouterModule]
})
export class BoardPageModule {}