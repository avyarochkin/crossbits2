import { GameProvider, BOARD_CELL } from './game'

type UndoListAtom = {
    x: number,
    y: number,
    was: BOARD_CELL,
    is: BOARD_CELL
}
type UndoListItem = UndoListAtom | Array<UndoListAtom>

export class UndoStack {
    list: UndoListItem[] = []
    index = 0

    constructor(private game: GameProvider) {}

    reset() {
        this.list = []
        this.index = 0
    }


    getCurrentItem(): UndoListItem {
        return (this.index < this.list.length) ? this.list[this.index] : null
    }


    setCurrentItem(value: UndoListItem) {
        if (this.index < this.list.length) {
            this.list[this.index] = value
        } else {
            this.list.push(value)
        }
    }


    startBlock() {
        this.setCurrentItem([])
    }


    endBlock() {
        let current = this.getCurrentItem() as UndoListAtom[]
        if (Array.isArray(current) && current.length) {
            this.index++
            //console.log(`undo block (${current.length}) added, list(${this.list.length}), index: ${this.index}`)
        } else {
            this.list.splice(this.index, 1)
            //console.log(`undo block canceled, list(${this.list.length}), index: ${this.index}`)
        }
    }


    addItem(item: UndoListAtom) {
        let current = this.getCurrentItem()
        if (Array.isArray(current)) {
            current.push(item)
        } else {
            this.list.splice(this.index, this.list.length)
            this.list.push(item)
            this.index++
            //console.log(`undo item added, list(${this.list.length}), index: ${this.index}`)
        }
    }


    canUndo(): boolean {
        return (this.index > 0)
    }


    undo() {

        function doUndo(game, item) {
            game.boardData[item.y][item.x].value = item.was
        }

        this.index--
        let current = this.getCurrentItem()

        if (Array.isArray(current)) {
            for (let i in current) {
                doUndo(this.game, current[i])
            }
            //console.log(`lock undone, list(${this.list.length}), index: ${this.index}`)
        } else {
            doUndo(this.game, current)
            //console.log(`item undone, list(${this.list.length}), index: ${this.index}`)
        }
    }


    canRedo(): boolean {
        return (this.index < this.list.length)
    }


    redo() {

        function doRedo(game, item) {
            game.boardData[item.y][item.x].value = item.is
        }

        let current = this.getCurrentItem()
        this.index++

        if (Array.isArray(current)) {
            for (let i in current) {
                doRedo(this.game, current[i])
            }
            //console.log(`block redone, list(${this.list.length}), index: ${this.index}`)
        } else {
            doRedo(this.game, current)
            //console.log(`item redone, list(${this.list.length}), index: ${this.index}`)
        }
    }
}