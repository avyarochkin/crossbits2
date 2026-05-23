import { getUrl } from '../../helpers/browser.js'
import { pause, restartApp, url } from '../../helpers/platform/index.js'
import BoardList from './board-list.po.js'

describe('Board List', () => {
    beforeEach(async () => {
        await restartApp('/list')
        await url('/list')
        await pause(500)
    })

    it('should load all swiper slides', async () => {
        const slides = await BoardList.swiper.slides
        await expect(slides).toHaveLength(6)
    })

    it('should open loaded board page', async () => {
        await BoardList.openLoadedBoard(0)
        const url = await getUrl()
        await expect(url.pathname).toBe('/board')
    })

    it('should navigate to next stage', async () => {
        await BoardList.goToNextStage()
        await BoardList.goToNextStage()
        const title = await BoardList.pageTitle
        const titleText = await title.getText()
        expect(titleText).toBe('STAGE 3')
    })

    it('should navigate to previous stage', async () => {
        await BoardList.goToNextStage()
        await BoardList.goToNextStage()
        await BoardList.goToPreviousStage()
        const title = await BoardList.pageTitle
        const titleText = await title.getText()
        expect(titleText).toBe('STAGE 2')
    })

    describe('Last Stage', () => {
        beforeEach(async () => {
            await BoardList.goToLastStage()
        })

        it('should contain new board button with 0 width and height on last stage', async () => {
            const newBoardButton = await BoardList.newBoardButton
            const dimensions = await newBoardButton.getSize()
            await expect(dimensions.width).toBe(0)
            await expect(dimensions.height).toBe(0)
        })

        it('should contain new board button with non-zero width and height in edit mode', async () => {
            await BoardList.clickEditButton()
            const newBoardButton = await BoardList.newBoardButton
            const dimensions = await newBoardButton.getSize()
            await expect(dimensions.width).toBeGreaterThan(0)
            await expect(dimensions.height).toBeGreaterThan(0)
        })

        it('should open new board page in edit mode', async () => {
            await BoardList.clickEditButton()
            await BoardList.openNewBoard()
            const url = await getUrl()
            await expect(url.pathname).toBe('/board')
        })
    })
})