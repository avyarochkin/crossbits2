import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { BoardSide, IHints } from '../../providers/game/game'

export type HintPoint = {
    x: number,
    y: number,
    side: BoardSide
}

const dirIndex = 'UDLR'
const dX = [0, 0, -1, 1]
const dY = [-1, 1, 0, 0]


@Component({
    selector: 'page-hint-pad',
    templateUrl: 'page-hint-pad.html',
})
export class HintPadPage {

    private value = 0
    public min = 0
    public max = 50

    public hintPos: HintPoint
    public hintPosChanged: (pos: HintPoint) => void
    public hints: IHints
    
    constructor(public navCtrl: NavController, public navParams: NavParams) {
        this.hintPos = navParams.get('pos')
        this.hintPosChanged = navParams.get('posChanged')
        this.hints = navParams.get('hints')
        this.setFromHints()
    }

    public move(dir: string) {
        let index = dirIndex.indexOf(dir)
        if (index >= 0) {
            this.setHintPos(this.hintPos.x + dX[index], this.hintPos.y + dY[index])
            this.setFromHints()
        }
    }

    public canMove(dir: string): boolean {
        return this.hints.canMove(this, dir)
    }
    public setFromHints() {
        let hint = this.hints.getHint(this.hintPos.x, this.hintPos.y, this.hintPos.side)
        this.value = (hint) ? parseInt(hint) : 0
        console.log(`hint-pad[${this.hintPos.x},${this.hintPos.y}] set to ${this.value}`)
    }

    public changeNum(num) {
        if (this.hints) {
            this.value = num
            let xy = this.hints.setHint(this.hintPos.x, this.hintPos.y, this.hintPos.side, this.value.toString())
            this.setHintPos(xy.x, xy.y)

        }
    }

    public dismiss() {
        this.navCtrl.pop({ animate: false })
    }

    private setHintPos(x: number, y: number) {
        this.hintPos.x = x
        this.hintPos.y = y
        if (this.hintPosChanged) {
            this.hintPosChanged(this.hintPos)
        }
    }
}
