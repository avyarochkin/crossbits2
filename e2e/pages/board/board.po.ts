import { Alert } from '../../helpers/components/index.js'
import { pause } from '../../helpers/index.js'

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

    async clickSaveBoardButton() {
        await this.saveBoardButton.click()
        await pause(2500)
    }

    async clickDeleteBoardButton() {
        await this.deleteBoardButton.click()
        await pause(500)
        await this.alert.buttonDelete.click()
        await pause(500)
    }

    async clickBackButton() {
        await this.backButton.click()
        await pause(500)
    }
}
export default new BoardPageObject()