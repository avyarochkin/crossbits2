import { Component, OnInit } from '@angular/core'
import {
    IonHeader, IonBackButton, IonToolbar, IonTitle, IonContent, IonButtons,
    IonList, IonRadio, IonItem, IonRadioGroup, IonFooter, IonButton,
    NavController
} from '@ionic/angular/standalone'

import { BoardGridComponent } from 'src/components/board-grid/board-grid'
import { GAME_STATUS } from 'src/providers/game/game.interface'
import { IGameProvider } from 'src/providers/game/game'
import { ColorMode } from 'src/components/board-canvas/board-canvas'
import { QUERY_PARAMS, SettingsProvider } from 'src/providers/settings/settings'
import { ActivatedRoute } from '@angular/router'
import { addIcons } from 'ionicons'
import { chevronDown } from 'ionicons/icons'

interface ColorModeEntry {
    value: ColorMode
    label: string
}

@Component({
    selector: 'page-color-mode',
    templateUrl: 'color-mode.page.html',
    styleUrls: ['color-mode.page.scss'],
    imports: [
        IonHeader, IonToolbar, IonFooter, IonButtons, IonBackButton, IonTitle, IonContent,
        IonRadioGroup, IonItem, IonRadio, IonList, IonButton,
        BoardGridComponent
    ]
})
export class ColorModePage implements OnInit {
    readonly colorModes: ColorModeEntry[] = [{
        value: 'light-dark',
        label: 'Light filled cells,<br>Dark empty cells'
    }, {
        value: 'light-crosses',
        label: 'Light filled cells,<br>Neutral empty cells marked with "x"'
    }, {
        value: 'dark-light',
        label: 'Dark filled cells,<br>Light empty cells'
    }, {
        value: 'dark-crosses',
        label: 'Dark filled cells,<br>Neutral empty cells marked with "x"'
    }]

    selectedColorMode: ColorMode
    initial: boolean

    readonly gameData: IGameProvider = {
        boardStatus: GAME_STATUS.GAME,
        boardData: [
            [-1, -1, -1, -1, -1, -1, -1, -1, -1],
            [-1, -1,  0,  0,  0,  0,  0, -1, -1],
            [-1,  0,  1,  0,  0,  0,  1,  0, -1],
            [-1,  0,  0,  0,  1,  0,  0,  0, -1],
            [-1,  0,  0,  0,  1,  0,  0,  0, -1],
            [-1,  0,  1,  0,  0,  0,  1,  0, -1],
            [-1,  0,  0,  1,  1,  1,  0,  0, -1],
            [-1, -1,  0,  0,  0,  0,  0, -1, -1],
            [-1, -1, -1, -1, -1, -1, -1, -1, -1]
        ].map(line => line.map(value => ({ value }))),
        columnHints: {
            hints: []
        },
        rowHints: {
            hints: []
        }
    }

    constructor(
        private readonly route: ActivatedRoute,
        private readonly navCtrl: NavController,
        private readonly settings: SettingsProvider
    ) {
        addIcons({ chevronDown })
    }

    ngOnInit(): void {
        this.selectedColorMode = this.settings.getColorMode()
        this.initial = Boolean(this.route.snapshot.queryParams?.[QUERY_PARAMS.INITIAL])
    }

    setMode(event: CustomEvent<{ value: ColorMode }>) {
        this.selectedColorMode = event.detail.value
        this.settings.setColorMode(this.selectedColorMode)
    }

    continue() {
        void this.navCtrl.navigateRoot('/', { animated: true, animationDirection: 'forward' })
    }
}