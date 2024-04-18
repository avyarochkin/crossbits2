import { pause, restartApp, url } from '../../helpers/platform/index.js'
import { getUrl } from '../../helpers/browser.js'
import BoardList from '../board-list/board-list.po.js'
import Board from './board.po.js'

describe('Board', () => {
    beforeEach(async () => {
        await restartApp('/')
        await url('/')
        await pause(500)
    })

    describe('New board', () => {
        beforeEach(async () => {
            await BoardList.goToLastStage()
            await BoardList.openNewBoard()
        })

        it('should save new board', async () => {
            await Board.saveBoardButton.click()
            await pause(2500)
            await expect((await getUrl()).pathname).toBe('/')
        })

        it('should delete new board', async () => {
            await Board.saveBoardButton.click()
            await pause(2500)
            await BoardList.editButton.click()
            await pause(500)
            const stageButtonCount = await BoardList.boardButtons.length
            await BoardList.openLoadedBoard(stageButtonCount - 2)
            await pause(500)
            await Board.deleteBoardButton.click()
            await pause(500)
            await Board.alert.buttonDelete.click()
            await pause(500)
            await expect((await getUrl()).pathname).toBe('/')
        })
    })

    describe('Loaded board', () => {
        beforeEach(async () => {
            await BoardList.openLoadedBoard(0)
        })

        it('should draw loaded board', async () => {
            await expect((await getUrl()).pathname).toBe('/board')
        })

        it('should go back to board list', async () => {
            await Board.backButton.click()
            await pause(500)
            await expect((await getUrl()).pathname).toBe('/')
        })
    })
})
