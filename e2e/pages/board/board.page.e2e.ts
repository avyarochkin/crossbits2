import { pause, restartApp, url } from '../../helpers/platform/index.js'
import { getUrl } from '../../helpers/browser.js'
import BoardList from '../board-list/board-list.po.js'
import Board from './board.po.js'

describe('Board', () => {
    beforeEach(async () => {
        await restartApp('/list')
        await url('/list')
        await pause(500)
    })

    describe('New board', () => {
        beforeEach(async () => {
            await BoardList.goToLastStage()
            await BoardList.clickEditButton()
            await BoardList.openNewBoard()
        })

        it('should save new board', async () => {
            await Board.clickSaveBoardButton()
            const url = await getUrl()
            await expect(url.pathname).toBe('/list')
        })

        it('should delete new board', async () => {
            await Board.clickSaveBoardButton()
            await BoardList.clickEditButton()
            const stageButtonCount = await BoardList.boardButtons.length
            await BoardList.openLoadedBoard(stageButtonCount - 2)
            await Board.clickDeleteBoardButton()
            const url = await getUrl()
            await expect(url.pathname).toBe('/list')
        })
    })

    describe('Loaded board', () => {
        beforeEach(async () => {
            await BoardList.openLoadedBoard(0)
        })

        it('should draw loaded board', async () => {
            const url = await getUrl()
            await expect(url.pathname).toBe('/board')
        })

        it('should go back to board list', async () => {
            await Board.clickBackButton()
            const url = await getUrl()
            await expect(url.pathname).toBe('/list')
        })
    })
})
