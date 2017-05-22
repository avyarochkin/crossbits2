import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { BoardSizePage } from './board-size';

@NgModule({
  declarations: [
    BoardSizePage,
  ],
  imports: [
    IonicPageModule.forChild(BoardSizePage),
  ],
  exports: [
    BoardSizePage
  ]
})
export class BoardSizePageModule {}
