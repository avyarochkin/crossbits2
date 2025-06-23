import { NgClass, NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, Input, ViewChild } from '@angular/core'

import { IGameProvider } from 'src/providers/game/game'
import { ColorMode } from 'src/components/board-canvas/board-canvas'

@Component({
    selector: 'board-grid',
    templateUrl: 'board-grid.html',
    styleUrls: ['board-grid.scss'],
    imports: [NgClass, NgTemplateOutlet]
})
export class BoardGridComponent {
    @ViewChild('canvas', { static: true }) canvasRef: ElementRef<HTMLElement>

    @Input() gameData: IGameProvider

    @Input() colorMode: ColorMode = 'light-dark'

    readonly boardCell = ['off', 'on']

}