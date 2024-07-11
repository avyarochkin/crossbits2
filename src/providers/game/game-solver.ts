import { BOARD_AXIS, BoardAxis, SOLUTION_STATUS } from './game.interface'
import { Hints } from './hints'
import { HintLineIndexes } from './hints.interface'

export interface LineQueueItem {
    axis: BoardAxis
    index: number
    combinations: number
}

export class GameSolver {
    /**
     * This property serves as a queue of lines (columns/rows) that should be
     * solved in the order from the last to the first element. The queue elements
     * are sorted by the number of combinations of possible solutions so that the
     * elements with the lowest number appear last.
     */
    private lineQueue: LineQueueItem[]

    constructor(
        private readonly columnHints: Hints,
        private readonly rowHints: Hints
    ) { }

    /**
     * Attempts to solve the whole game line by line by taking the line indexes from
     * **lineQueue** sorted by the number of combinations of solutions (lowest last).
     *
     * While the queue is not empty, takes the next line index from the tail of the
     * queue and attempts to solve this line. If the line solve brought back some
     * impacted lines from the orthogonal axis, adds their indexes to the queue and
     * re-sorts it again by the number of combinations of solutions.
     * Stops when the queue is empty.
     *
     * **Note:** This algorithm depends on the line solver, which has an upper limit
     * of combinations to handle and can give up. Therefore, this algorithm can skip
     * the "complex" lines and stop at an unsolved stage.
     *
     * @param updateBoard this function will be called by the solver every time when
     * it wants to update the board on the UI
     *
     * @returns solution status (@see SOLUTION_STATUS)
     */
    async solveGame(updateBoard: () => void): Promise<SOLUTION_STATUS>  {
        this.initLineQueue()
        let solutionStatus = SOLUTION_STATUS.UNFINISHED

        while (this.lineQueue.length > 0) {
            const { axis, index } = this.lineQueue.pop()!
            let impactedIndexes: HintLineIndexes = undefined
            switch (axis) {
                case BOARD_AXIS.COLUMN:
                    impactedIndexes = this.columnHints.solveLine(index)
                    this.columnHints.checkLine(index, true)
                    this.prioritizeImpactedItems(BOARD_AXIS.ROW, impactedIndexes ?? null)
                    break
                case BOARD_AXIS.ROW:
                    impactedIndexes = this.rowHints.solveLine(index)
                    this.rowHints.checkLine(index, true)
                    this.prioritizeImpactedItems(BOARD_AXIS.COLUMN, impactedIndexes)
                    break
                default:
            }
            if (impactedIndexes == null) {
                solutionStatus = impactedIndexes === null
                    ? SOLUTION_STATUS.NO_SOLUTION
                    : SOLUTION_STATUS.GAVE_UP
            }
            // console.info(`GameSolver line queue: ${this.lineQueue.length} left`)
            await new Promise<void>(resolve =>
                setTimeout(() => {
                    updateBoard()
                    resolve()
                }, 0)
            )
        }
        return solutionStatus
    }

    /**
     * Initializes the line queue by adding all unfinished columns and rows with
     * their number of combinations of solutions possible initially.
     * Skips a column/row if it has been fully solved already.
     * In conclusion sorts the created elements by the number of combinations.
     */
    private initLineQueue() {
        const columnItems = Array
            .from(
                { length: this.columnHints.hints.length },
                (el, index) => this.getLineQueueItem(BOARD_AXIS.COLUMN, index)
            )
            .filter((item, index) => !this.columnHints.checkLine(index, true))
        const rowItems = Array
            .from(
                { length: this.rowHints.hints.length },
                (el, index) => this.getLineQueueItem(BOARD_AXIS.ROW, index)
            )
            .filter((item, index) => !this.rowHints.checkLine(index, true))

        this.lineQueue = [...rowItems, ...columnItems]
        this.sortQueueByLessCombinations()
    }

    /**
     * Prioritizes elements in the queue according to the provided `impactedIndexes`
     * in the `impactedAxis`. Checks that all impacted indexes are still in the
     * queue and adds missing ones.
     * In conclusion sorts all remaining elements by the number of combinations.
     * @param impactedAxis impacted axis (**V** or **H**)
     * @param impactedIndexes array of impacted indexes in this axis
     */
    private prioritizeImpactedItems(impactedAxis: BoardAxis, impactedIndexes: HintLineIndexes) {
        if (impactedIndexes == null) { return }
        for (const impactedIndex of impactedIndexes) {
            const item = this.lineQueue.find(({ axis, index }) =>
                axis === impactedAxis && index === impactedIndex
            )
            if (item == null) {
                this.lineQueue.push(this.getLineQueueItem(impactedAxis, impactedIndex))
            }
        }
        this.sortQueueByLessCombinations()
    }

    /**
     * Sorts **lineQueue** by the number of combinations (lowest numbers last).
     */
    private sortQueueByLessCombinations() {
        this.lineQueue.sort((a, b) => b.combinations - a.combinations)
    }

    /**
     * Creates a **LineQueueItem** for the given axis and index
     * @param axis board axis (**V** or **H**)
     * @param index line index for the given axis
     * * column index for axis **V**
     * * row index for axis **H**
     * @returns created item with axis, line index and computer number of possible
     * combinations.
     */
    private getLineQueueItem(axis: BoardAxis, index: number): LineQueueItem {
        return {
            axis,
            index,
            combinations: axis === BOARD_AXIS.COLUMN
                ? this.columnHints.getNumberOfCombinations(index)
                : this.rowHints.getNumberOfCombinations(index)
        }
    }
}