import { BOARD_AXIS, BoardAxis, SolutionQueueItem } from './game.interface'
import { Hints } from './hints'

export class GameSolver {
    private queue: SolutionQueueItem[]

    constructor(
        private readonly columnHints: Hints,
        private readonly rowHints: Hints
    ) { }

    async solveGame(updateBoard: () => void) {
        this.queue = this.initQueue()

        while (this.queue.length > 0) {
            const { axis, index } = this.queue.pop()!
            switch (axis) {
                case BOARD_AXIS.COLUMN:
                    const impactedRowIndexes = this.columnHints.solveLine(index)
                    this.columnHints.checkLine(index)
                    this.prioritizeImpactedItems(BOARD_AXIS.ROW, impactedRowIndexes)
                    break
                case BOARD_AXIS.ROW:
                    const impactedColumnIndexes = this.rowHints.solveLine(index)
                    this.rowHints.checkLine(index)
                    this.prioritizeImpactedItems(BOARD_AXIS.COLUMN, impactedColumnIndexes)
                    break
                default:
            }
            console.info(`SOLVED ${axis}${index}, ${this.queue.length} checks left`)
            await new Promise<void>(resolve =>
                setTimeout(() => {
                    updateBoard()
                    resolve()
                }, 0)
            )
        }
    }

    private initQueue(): SolutionQueueItem[] {
        const columnItems = Array.from(
            { length: this.columnHints.hints.length },
            (el, index) => ({ axis: BOARD_AXIS.COLUMN, index })
        ).reverse()
        const rowItems = Array.from(
            { length: this.rowHints.hints.length },
            (el, index) => ({ axis: BOARD_AXIS.ROW, index })
        ).reverse()

        return [...rowItems, ...columnItems]
    }

    private prioritizeImpactedItems(impactedAxis: BoardAxis, impactedIndexes: number[]) {
        for (const impactedIndex of impactedIndexes.reverse()) {
            const itemIndex = this.queue.findIndex(({ axis, index }) =>
                axis === impactedAxis && index === impactedIndex
            )
            const item = itemIndex >= 0
                ? this.queue.splice(itemIndex, 1)[0]
                : { axis: impactedAxis, index: impactedIndex }
            this.queue.push(item)
        }
    }
}