import { Component } from '@angular/core'
import { GestureController, GestureDetail, PickerColumnOption, PickerController } from '@ionic/angular'

import { BOARD_PART, BOARD_SIDE, BoardSide } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { Hints } from 'src/providers/game/hints'
import { BoardCanvasComponent } from './board-canvas'

@Component({
    selector: 'setup-board-canvas',
    template: '<canvas #canvas></canvas>',
    styles: [`
        :host {
            display: block;
        }
    `]
})
export class SetupBoardCanvasComponent extends BoardCanvasComponent {

    constructor(
        protected readonly gestureCtrl: GestureController,
        private readonly pickerCtrl: PickerController,
        protected readonly game: GameProvider
    ) {
        super(gestureCtrl, game)
    }

    protected handleTap(detail: GestureDetail) {
        const boardPos = this.getBoardPos(detail)
        if (boardPos == null || this.isGameOver()) { return }

        switch (boardPos.kind) {
            case BOARD_PART.HINT_TOP:
                void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.TOP, this.game.columnHints)
                break
            case BOARD_PART.HINT_BOTTOM:
                void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.BOTTOM, this.game.columnHints)
                break
            case BOARD_PART.HINT_LEFT:
                void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.LEFT, this.game.rowHints)
                break
            case BOARD_PART.HINT_RIGHT:
                void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.RIGHT, this.game.rowHints)
                break
            default:
        }
    }

    protected handlePress() { }
    protected handlePanMove() { }
    protected handlePanEnd() { }

    private async editHint(x: number, y: number, side: BoardSide, hints: Hints) {
        this.hintPos = { x: x, y: y, side: side }
        this.paint()

        const hint = hints.getHintXY(x, y, side)
        const selectedIndex = (hint) ? parseInt(hint, 10) : 0

        const picker = await this.pickerCtrl.create({
            columns: [{
                name: 'valueColumn',
                selectedIndex,
                options: Array.from(
                    { length: hints.getBoardLength() + 1 },
                    (el, index) => ({
                        text: index.toString(),
                        value: index
                    })
                )
            }],
            buttons: [
                { role: 'cancel', text: 'CANCEL' },
                { role: 'apply', text: 'OK' }
            ]
        })
        void picker.onDidDismiss<{ valueColumn: PickerColumnOption }>().then(detail => {
            if (detail.role === 'apply') {
                const value = detail.data!.valueColumn.value as number
                hints.setHintXY(x, y, side, value > 0 ? value.toString() : null)

                this.hintPos = null
                this.paint()
            }
        })
        await picker.present()
    }
}