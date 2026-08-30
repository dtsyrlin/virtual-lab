import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
    Rectangle,
} from "pixi.js";


export interface DynamicsTrack2DOptions {

    position: {
        x: number;
        y: number;
    };

    length: number;

    pixelsPerMeter: number;

    angleRadians?: number;

    maxAngleRadians?: number;

    trackThickness?: number;

    stopperHeight?: number;
    stopperWidth?: number;
}


export class DynamicsTrack2D extends Container {

    public readonly length: number;

    public readonly pixelsPerMeter: number;

    private _angleRadians: number;

    private readonly maxAngleRadians: number;

    private readonly trackThickness: number;

    private readonly stopperHeight: number;
    private readonly stopperWidth: number;

    private readonly baselineY: number;

    private readonly fixedRightX: number;
    private readonly fixedRightY: number;

    private readonly supportGraphics =
        new Graphics();

    private readonly trackGraphics =
        new Graphics();

    private readonly leftStopper =
        new Graphics();

    private draggingLeftEnd =
        false;

    private dragOffsetY =
        0;

    private onAngleChanged?: (
        angleRadians: number
    ) => void;


    constructor({
        position,

        length,

        pixelsPerMeter,

        angleRadians = 0,

        maxAngleRadians =
            Math.PI /
            6,

        trackThickness = 8,

        stopperHeight = 70,
        stopperWidth = 12,
    }: DynamicsTrack2DOptions) {

        super();


        this.length =
            length;

        this.pixelsPerMeter =
            pixelsPerMeter;

        this._angleRadians =
            angleRadians;

        this.maxAngleRadians =
            maxAngleRadians;

        this.trackThickness =
            trackThickness;

        this.stopperHeight =
            stopperHeight;

        this.stopperWidth =
            stopperWidth;


        const lengthPixels =
            this.length *
            this.pixelsPerMeter;


        this.baselineY =
            position.y;

        this.fixedRightX =
            position.x +
            lengthPixels;

        this.fixedRightY =
            position.y;


        this.addChild(
            this.supportGraphics
        );

        this.addChild(
            this.trackGraphics
        );

        this.addChild(
            this.leftStopper
        );


        this.leftStopper.eventMode =
            "static";

        this.leftStopper.cursor =
            "ns-resize";

        this.leftStopper.hitArea =
            new Rectangle(
                -20,
                -this.stopperHeight - 12,
                40,
                this.stopperHeight + 24
            );


        this.leftStopper.on(
            "pointerdown",
            this.handleLeftPointerDown
        );

        this.leftStopper.on(
            "globalpointermove",
            this.handleLeftPointerMove
        );

        this.leftStopper.on(
            "pointerup",
            this.handleLeftPointerUp
        );

        this.leftStopper.on(
            "pointerupoutside",
            this.handleLeftPointerUp
        );


        this.drawTrack();

        this.setAngle(
            this._angleRadians
        );
    }


    private drawTrack() {

        this.trackGraphics.clear();

        this.leftStopper.clear();


        const lengthPixels =
            this.length *
            this.pixelsPerMeter;


        this.trackGraphics
            .moveTo(
                0,
                -this.trackThickness /
                    2
            )
            .lineTo(
                lengthPixels,
                -this.trackThickness /
                    2
            )
            .stroke({
                color: 0x777777,
                width:
                    this.trackThickness,
            });


        this.trackGraphics
            .rect(
                lengthPixels,
                -this.stopperHeight,
                this.stopperWidth,
                this.stopperHeight
            )
            .fill(
                0x777777
            );


        this.leftStopper
            .rect(
                -this.stopperWidth,
                -this.stopperHeight,
                this.stopperWidth,
                this.stopperHeight
            )
            .fill(
                0x777777
            );
    }


    private drawSupport() {

        this.supportGraphics.clear();


        const supportHeight =
            Math.max(
                0,
                this.baselineY -
                this.position.y
            );


        if (
            supportHeight <= 0
        ) {

            return;
        }


        this.supportGraphics.rotation =
            -this._angleRadians;


        this.supportGraphics
            .rect(
                -4,
                0,
                8,
                supportHeight
            )
            .fill(
                0x777777
            );


        this.supportGraphics
            .rect(
                -18,
                supportHeight - 6,
                36,
                6
            )
            .fill(
                0x777777
            );
    }


    private handleLeftPointerDown = (
        event:
            FederatedPointerEvent
    ) => {

        this.draggingLeftEnd =
            true;


        this.dragOffsetY =
            event.global.y -
            this.position.y;
    };


    private handleLeftPointerMove = (
        event:
            FederatedPointerEvent
    ) => {

        if (
            !this.draggingLeftEnd
        ) {

            return;
        }


        const requestedLeftY =
            event.global.y -
            this.dragOffsetY;


        const lengthPixels =
            this.length *
            this.pixelsPerMeter;


        const maxRise =
            lengthPixels *
            Math.sin(
                this.maxAngleRadians
            );


        const rise =
            Math.max(
                0,
                Math.min(
                    maxRise,
                    this.baselineY -
                    requestedLeftY
                )
            );


        const angleRadians =
            Math.asin(
                rise /
                lengthPixels
            );


        this.setAngle(
            angleRadians
        );


        this.onAngleChanged?.(
            angleRadians
        );
    };


    private handleLeftPointerUp = () => {

        this.draggingLeftEnd =
            false;
    };


    public setOnAngleChanged(
        callback:
            (
                angleRadians:
                    number
            ) => void
    ) {

        this.onAngleChanged =
            callback;
    }


    public setAngle(
        angleRadians: number
    ) {

        this._angleRadians =
            Math.max(
                0,
                Math.min(
                    this.maxAngleRadians,
                    angleRadians
                )
            );


        const lengthPixels =
            this.length *
            this.pixelsPerMeter;


        this.position.set(
            this.fixedRightX -
                lengthPixels *
                Math.cos(
                    this._angleRadians
                ),

            this.fixedRightY -
                lengthPixels *
                Math.sin(
                    this._angleRadians
                )
        );


        this.rotation =
            this._angleRadians;


        this.drawSupport();
    }


    public get angleRadians(): number {

        return this._angleRadians;
    }


    public getPointAt(
        positionMeters: number
    ): Point {

        return this.toGlobal(
            new Point(
                positionMeters *
                    this.pixelsPerMeter,

                -this.trackThickness
            )
        );
    }


    public getPositionFromPoint(
        point: Point
    ): number {

        const localPoint =
            this.toLocal(
                point
            );


        return (
            localPoint.x /
            this.pixelsPerMeter
        );
    }


    public clampPosition(
        positionMeters: number
    ): number {

        if (
            positionMeters < 0
        ) {

            return 0;
        }


        if (
            positionMeters >
            this.length
        ) {

            return this.length;
        }


        return positionMeters;
    }


    public get leftStopPosition(): number {

        return 0;
    }


    public get rightStopPosition(): number {

        return this.length;
    }


    public get trackSurfaceOffsetPixels(): number {

        return this.trackThickness;
    }
}
