import { Component, ElementRef, ViewChild } from '@angular/core';
import { GameProvider } from 'src/providers/game/game';

@Component({
    selector: 'board-grid',
    templateUrl: 'board-grid.html',
    styleUrls: ['board-grid.scss'],
    standalone: false
})
export class BoardGridComponent {
    @ViewChild('canvas', { static: true }) canvasRef: ElementRef<HTMLElement>

    readonly boardCell = { 0: 'off', 1: 'on' }

    constructor(
        public readonly game: GameProvider
    ) {}
}