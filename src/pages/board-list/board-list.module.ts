import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'

import { BoardListPage } from './board-list.page'
import { IonicModule } from '@ionic/angular'
import { CommonModule } from '@angular/common'

@NgModule({
    imports: [
        IonicModule,
        CommonModule,
        RouterModule.forChild([{ path: '', component: BoardListPage }])
    ],
    declarations: [BoardListPage],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BoardListPageModule {}