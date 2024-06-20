import { NgModule } from '@angular/core'
import { IonicModule } from '@ionic/angular'
import { CommonModule } from '@angular/common'

import { HintPickerPage } from './hint-picker.page'

@NgModule({
    imports: [
        IonicModule,
        CommonModule
    ],
    declarations: [HintPickerPage]
})
export class HintPickerPageModule { }