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
        const button = await this.boardButtons[index]
        await button.click()
        await pause(500)
    }

    async goToNextStage() {
        await this.nextStageButton.click()
        await pause(500)
    }

    async goToPreviousStage() {
        await this.prevStageButton.click()
        await pause(500)
    }

    async goToLastStage() {
        const slides = await this.swiper.slides
        const stageCount = await slides.length
        for (let targetStage = 1; targetStage < stageCount; targetStage++) {
            await this.goToNextStage()
        }
    }

    async openNewBoard() {
        const button = await this.newBoardButton
        await button.click()
        await pause(500)
        const buttonOK = this.picker.buttonOK
        await buttonOK.click()
        await pause(1000)
    }

    async clickEditButton() {
        await this.editButton.click()
        await pause(500)
    }
}
export default new BoardListPageObject()
