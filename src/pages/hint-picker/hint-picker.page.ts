import { Component, Input } from '@angular/core'
import { ModalController } from '@ionic/angular'

@Component({
    selector: 'app-hint-picker',
    templateUrl: './hint-picker.page.html',
    styleUrls: ['./hint-picker.page.scss']
})
export class HintPickerPage {

    @Input() set hintCount(value: number) {
        this.buttonIndexes = Array.from(
            { length: value + 1 },
            (el, index) => index
        )
    }

    @Input() selectedHint: number

    protected buttonIndexes: number[]

    constructor(
        private readonly modalCtrl: ModalController
    ) { }

    protected async selectHint(index: number) {
        await this.modalCtrl.dismiss(index, 'select')
    }
}
