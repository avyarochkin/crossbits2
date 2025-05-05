import { NgClass } from '@angular/common'
import { Component, ElementRef, ViewChild } from '@angular/core'

import { GameProvider } from 'src/providers/game/game'

@Component({
    selector: 'board-grid',
    templateUrl: 'board-grid.html',
    styleUrls: ['board-grid.scss'],
    imports: [NgClass],
    standalone: true
})
export class BoardGridComponent {
    @ViewChild('canvas', { static: true }) canvasRef: ElementRef<HTMLElement>

    readonly boardCell = ['off', 'on']

    constructor(
        readonly game: GameProvider
    ) {}
}