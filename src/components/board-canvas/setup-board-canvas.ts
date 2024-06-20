import { Component } from '@angular/core'
import { GestureController, GestureDetail, ModalController } from '@ionic/angular'

import { BOARD_PART, BOARD_SIDE, BoardSide } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { Hints } from 'src/providers/game/hints'
import { HintPickerPage } from 'src/pages/hint-picker/hint-picker.page'
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
        private readonly modalCtrl: ModalController,
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

        const hintStr = hints.getHintXY(x, y, side)
        const selectedValue = (hintStr) ? parseInt(hintStr, 10) : 0
        const hintLine = hints.getHintLineXY(x, y)
        const usedTotal = hintLine
            .reduce((prev, curr) => prev + curr.hint, 0)
            + hintLine.length
            - (selectedValue > 0 ? selectedValue + 1 : 0)
        const leftTotal = Math.max(hints.getBoardLength() - usedTotal, 0)

        const modal = await this.modalCtrl.create({
            component: HintPickerPage,
            breakpoints: [0, 1],
            initialBreakpoint: 1,
            cssClass: 'auto-height',
            componentProps: {
                selectedHint: selectedValue,
                hintCount: leftTotal
            }
        })
        void modal.onWillDismiss().then(detail => {
            if (detail.role === 'select') {
                const value = detail.data! as number
                hints.setHintXY(x, y, side, value > 0 ? value.toString() : null)
            }
            this.hintPos = null
            this.paint()
        })
        await modal.present()
    }
}