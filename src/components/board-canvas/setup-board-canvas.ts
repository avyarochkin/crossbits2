import { Component, Renderer2 } from '@angular/core'
import { ModalController } from '@ionic/angular/standalone'

import { BOARD_PART, BOARD_SIDE, BoardSide } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { Hints } from 'src/providers/game/hints'
import { HintPoint } from 'src/providers/game/hints.interface'
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
        private readonly modalCtrl: ModalController,
        protected readonly renderer: Renderer2,
        protected readonly game: GameProvider
    ) {
        super(renderer, game)
    }

    protected handleTap(event: PointerEvent) {
        const boardPos = this.getBoardPos(event)
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

    protected handleLongPress() { }
    protected handlePanMove() { }
    protected handlePanEnd() { }

    private async editHint(x: number, y: number, side: BoardSide, hints: Hints) {
        this.hintPos = { x: x, y: y, side: side }
        this.paint()

        const modal = await this.modalCtrl.create({
            component: HintPickerPage,
            breakpoints: [0, 1],
            initialBreakpoint: 1,
            cssClass: 'auto-height',
            componentProps: {
                hints,
                hintPos: this.hintPos,
                onChange: (hintPos: HintPoint) => {
                    this.hintPos = hintPos
                    this.paint()
                }
            }
        })
        void modal.onWillDismiss().then(() => {
            this.hintPos = null
            this.paint()
        })
        await modal.present()
    }
}
