import { pause, restartApp, url } from '../../helpers/platform/index.js'
import { getUrl } from '../../helpers/browser.js'
import BoardList from '../board-list/board-list.po.js'

describe('Board', () => {
    beforeEach(async () => {
        await restartApp('/')
        await url('/board')
        await pause(500)
        await BoardList.boardButtons[0].click()
        await pause(500)
    })

    it('should draw board', async () => {
        await expect((await getUrl()).pathname).toBe('/board')
    })
})
