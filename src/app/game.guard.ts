import { Injectable } from '@angular/core'
import { CanActivate, Router, UrlTree } from '@angular/router'
import { GameProvider } from '../providers/game/game'

@Injectable()
export class GameGuard implements CanActivate {
    constructor(
        private readonly router: Router,
        private readonly game: GameProvider
    ) { }

    canActivate(): boolean | UrlTree  {
        return this.game.boardData.length > 0
            ? true
            : this.router.parseUrl('/')
    }
}