import { BOARD_CELL } from './game.interface'

export interface UndoListAtom {
    x: number
    y: number
    was: BOARD_CELL
    is: BOARD_CELL
}

export type UndoListItem = UndoListAtom | UndoListAtom[]
