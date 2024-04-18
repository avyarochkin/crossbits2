import { Alert } from '../../helpers/components/index.js'

class BoardPageObject {
    get alert() {
        return new Alert()
    }

    get boardCanvas() {
        return $('.board-canvas')
    }

    get backButton() {
        return $('.back-button')
    }

    get deleteBoardButton() {
        return $('.delete-board-button')
    }

    get saveBoardButton() {
        return $('.save-board-button')
    }

    get zoonInButton() {
        return $('.zoon-in-button')
    }

    get zoomOutButton() {
        return $('.zoom-out-button')
    }

    get clearBoardButton() {
        return $('.clear-board-button')
    }

    get undoMoveButton() {
        return $('.undo-move-button')
    }

    get redoMoveButton() {
        return $('.redo-move-button')
    }
}
export default new BoardPageObject()