import { Swiper } from '../../helpers/components/index.js'

class BoardListPageObject {
    get swiper() {
        return new Swiper('.stage-slides')
    }

    get boardButtons() {
        return $$('button.stage-board')
    }

    get newBoardButton() {
        return $('button.stage-board.new')
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
}
export default new BoardListPageObject()
