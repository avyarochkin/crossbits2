import { getUrl } from '../../helpers/browser.js'
import { pause, restartApp, url } from '../../helpers/platform/index.js'
import BoardList from './board-list.po.js'

describe('Board List', () => {
    beforeEach(async () => {
        await restartApp('/')
        await url('/')
        await pause(500)
    })

    it('should load all swiper slides', async () => {
        await expect(await BoardList.swiper.slides).toHaveLength(5)
    })

    it('should open loaded board page', async () => {
        await BoardList.boardButtons[0].click()
        await pause(500)
        await expect((await getUrl()).pathname).toBe('/board')
    })

    describe('Last Stage', () => {
        beforeEach(async () => {
            await BoardList.swiper.swipeLeft()
            await BoardList.swiper.swipeLeft()
            await BoardList.swiper.swipeLeft()
            await BoardList.swiper.swipeLeft()
        })

        it('should open new board page', async () => {
            await BoardList.newBoardButton.click()
            await pause(500)
            await expect((await getUrl()).pathname).toBe('/board')
        })

        it('should switch to edit mode', async () => {
            await BoardList.editButton.click()
            await pause(500)
            await expect((await BoardList.editButton).getElementText).toBe('EDIT')
        })
    })
})