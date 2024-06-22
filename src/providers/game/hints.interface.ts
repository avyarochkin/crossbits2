import { BoardSide, Point } from './game.interface'

export interface HintCell {
    hint: number
}

export interface VariantPiece {
    start: number
    end: number
}

export interface HintPoint extends Point {
    side: BoardSide
}
