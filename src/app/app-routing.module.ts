import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { GameGuard } from './game.guard'

const ROUTES: Routes = [
    {
        path: '',
        loadChildren: () => import('src/pages/board-list/board-list.module')
            .then(m => m.BoardListPageModule)
    },
    {
        path: 'board',
        canActivate: [GameGuard],
        loadChildren: () => import('src/pages/board/board.module')
            .then(m => m.BoardPageModule)
    }
]

@NgModule({
    imports: [RouterModule.forRoot(ROUTES)],
    exports: [RouterModule],
    providers: [GameGuard]
})
export class AppRoutingModule { }