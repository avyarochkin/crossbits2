import { Component, ElementRef } from '@angular/core'
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone'
import { filter, fromEvent, Observable, scan, timeInterval } from 'rxjs'
import { register } from 'swiper/element/bundle'

const MAX_DOUBLE_TAP_MSEC = 300

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    imports: [IonApp, IonRouterOutlet]
})
export class MyApp {
    readonly touchEvents$: Observable<TouchEvent>

    constructor(private readonly hostRef: ElementRef<HTMLElement>) {
        register()

        this.touchEvents$ = fromEvent<TouchEvent>(this.hostRef.nativeElement, 'touchstart', { passive: false })
        this.preventAutoZoomOnMultiTouch()
        this.preventAutoZoomOnDoubleTap()
    }

    private preventAutoZoomOnMultiTouch() {
        this.touchEvents$.pipe(
            filter(event => event.touches?.length > 1)
        ).subscribe(event => {
            event.preventDefault()
        })
    }

    private preventAutoZoomOnDoubleTap() {
        this.touchEvents$.pipe(
            filter(event => event instanceof TouchEvent),
            timeInterval(),
            scan((acc, { interval, value: event }) =>
                interval < MAX_DOUBLE_TAP_MSEC
                    ? { event, counter: acc.counter + 1 }
                    : { event, counter: 1 }, {
                event: {} as TouchEvent,
                counter: 0
            }),
            filter(({ counter }) => counter >= 2)
        ).subscribe(({ event }) => {
            event.preventDefault()
        })
    }
}
