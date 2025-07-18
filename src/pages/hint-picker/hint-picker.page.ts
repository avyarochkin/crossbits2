import { Component, Input, OnInit } from '@angular/core'
import { IonButton, IonButtons, IonIcon, IonToolbar, ModalController } from '@ionic/angular/standalone'
import { addIcons } from 'ionicons'
import { arrowBack, arrowDown, arrowForward, arrowUp, close } from 'ionicons/icons'

import { LocalStorageProvider } from 'src/providers/local-storage/local-storage'
import { HintPoint } from 'src/providers/game/hints.interface'
import { BoardSide, Point } from 'src/providers/game/game.interface'
import { Hints } from 'src/providers/game/hints'

type HintChangeHandler = (hintPos: HintPoint) => void
const AUTO_ADVANCE = 'auto-advance'

@Component({
    selector: 'app-hint-picker',
    templateUrl: './hint-picker.page.html',
    styleUrls: ['./hint-picker.page.scss'],
    imports: [
        IonToolbar, IonButtons, IonButton, IonIcon
    ]
})
export class HintPickerPage implements OnInit {
    @Input() hints: Hints
    @Input() hintPos: HintPoint
    @Input() onChange: HintChangeHandler

    protected selectedHint: number

    protected enabledButtons: boolean[]

    protected autoAdvance = false

    protected readonly retreatIcon: Record<BoardSide, string> = {
        T: 'arrow-down',
        B: 'arrow-up',
        L: 'arrow-forward',
        R: 'arrow-back'
    }
    protected readonly advanceIcon: Record<BoardSide, string> = {
        T: 'arrow-up',
        B: 'arrow-down',
        L: 'arrow-back',
        R: 'arrow-forward'
    }

    constructor(
        private readonly localStorage: LocalStorageProvider,
        private readonly modalCtrl: ModalController
    ) {
        addIcons({ close, arrowUp, arrowDown, arrowForward, arrowBack })
    }

    ngOnInit(): void {
        this.autoAdvance = this.localStorage.getValue(AUTO_ADVANCE)
        this.updatePage()
    }

    protected toggleAutoAdvance() {
        this.autoAdvance = !this.autoAdvance
        this.localStorage.setValue(AUTO_ADVANCE, this.autoAdvance)
    }

    protected async selectHint(value: number) {
        const valueStr = value > 0 ? value.toString() : null
        const { x, y, side } = this.hintPos
        this.updateHintPos(this.hints.setHintAt({ x, y, side }, valueStr))

        if (this.autoAdvance) {
            this.nextHintPos()
        } else {
            await this.dismiss()
        }
    }

    protected async dismiss() {
        await this.modalCtrl.dismiss()
    }

    protected nextHintPos() {
        this.updateHintPos(this.hints.nextEditableHintPos(this.hintPos))
        this.updatePage()
    }

    protected previousHintPos() {
        this.updateHintPos(this.hints.previousEditableHintPos(this.hintPos))
        this.updatePage()
    }

    private updatePage() {
        this.selectedHint = this.hints.getHintValueAt(this.hintPos)

        const hintLineLeftTotal = this.hints.getHintLineLeftTotalAt(this.hintPos)
        const hintLineTotal = this.hints.getBoardLength()
        this.enabledButtons = Array.from(
            { length: hintLineTotal + 1 },
            (el, index) => index <= hintLineLeftTotal
        )

        if (this.onChange != null) {
            this.onChange(this.hintPos)
        }
    }

    private updateHintPos(pos: Point) {
        this.hintPos.x = pos.x
        this.hintPos.y = pos.y
    }
}
