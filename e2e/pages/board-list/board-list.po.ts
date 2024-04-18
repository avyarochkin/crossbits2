import { Picker, Swiper } from '../../helpers/components/index.js'
import { pause } from '../../helpers/platform/index.js'

class BoardListPageObject {
    get swiper() {
        return new Swiper('.stage-slides')
    }

    get picker() {
        return new Picker()
    }

    get pageTitle() {
        return $('ion-header ion-title')
    }

    get boardButtons() {
        return $$('button.stage-board')
    }

    get newBoardButton() {
        return $('button.stage-board.new')
    }

    get nextStageButton() {
        return $('.next-stage-button')
    }

    get prevStageButton() {
        return $('.prev-stage-button')
    }

    get editButton() {
        return $('.editing-button')
    }

    swipeLeft() {
        return this.swiper.swipeLeft()
    }

    swipeRight() {
        return this.swiper.swipeRight()
    }

    async openLoadedBoard(index: number) {
        await this.boardButtons[index].click()
        await pause(500)
    }

    async goToLastStage() {
        await this.nextStageButton.click()
        await this.nextStageButton.click()
        await this.nextStageButton.click()
        await this.nextStageButton.click()
        await pause(500)
    }

    async openNewBoard() {
        await this.newBoardButton.click()
        await pause(500)
        await this.picker.buttonOK.click()
        await pause(1000)
    }
}
export default new BoardListPageObject()
