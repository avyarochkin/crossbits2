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

    it('should navigate to next stage', async () => {
        await BoardList.nextStageButton.click()
        await BoardList.nextStageButton.click()
        const title = await BoardList.pageTitle
        expect(await title.getText()).toBe('STAGE 3')
    })

    it('should navigate to previous stage', async () => {
        await BoardList.nextStageButton.click()
        await BoardList.nextStageButton.click()
        await BoardList.prevStageButton.click()
        const title = await BoardList.pageTitle
        expect(await title.getText()).toBe('STAGE 2')
    })

    describe('Last Stage', () => {
        beforeEach(async () => {
            await BoardList.goToLastStage()
        })

        it('should open new board page', async () => {
            await BoardList.openNewBoard()
            await expect((await getUrl()).pathname).toBe('/board')
        })

        it('should switch to edit mode', async () => {
            const editButton = await BoardList.editButton
            await expect(await editButton.getText()).toBe('EDIT')
            await BoardList.editButton.click()
            await pause(500)
            const doneButton = await BoardList.editButton
            await expect(await doneButton.getText()).toBe('DONE')
        })
    })
})