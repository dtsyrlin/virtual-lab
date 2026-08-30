import {
    Container,
    Graphics,
    Point,
} from "pixi.js";


export interface DynamicsTrack2DOptions {

    position: {
        x: number;
        y: number;
    };

    length: number;

    pixelsPerMeter: number;

    angleRadians?: number;

    trackThickness?: number;

    stopperHeight?: number;
    stopperWidth?: number;
}


export class DynamicsTrack2D extends Container {

    public readonly length: number;

    public readonly pixelsPerMeter: number;

    private _angleRadians: number;

    private readonly trackThickness: number;

    private readonly stopperHeight: number;
    private readonly stopperWidth: number;

    private readonly graphics =
        new Graphics();


    constructor({
        position,

        length,

        pixelsPerMeter,

        angleRadians = 0,

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

        this.trackThickness =
            trackThickness;

        this.stopperHeight =
            stopperHeight;

        this.stopperWidth =
            stopperWidth;


        this.position.set(
            position.x,
            position.y
        );


        this.rotation =
            this._angleRadians;


        this.addChild(
            this.graphics
        );


        this.draw();
    }


    private draw() {

        this.graphics.clear();


        const lengthPixels =
            this.length *
            this.pixelsPerMeter;


        this.graphics
            .rect(
                0,
                -this.trackThickness,
                lengthPixels,
                this.trackThickness
            )
            .fill(
                0x777777
            );


        this.graphics
            .rect(
                -this.stopperWidth,
                -this.stopperHeight,
                this.stopperWidth,
                this.stopperHeight
            )
            .fill(
                0x777777
            );


        this.graphics
            .rect(
                lengthPixels,
                -this.stopperHeight,
                this.stopperWidth,
                this.stopperHeight
            )
            .fill(
                0x777777
            );
    }


    public setAngle(
        angleRadians: number
    ) {

        this._angleRadians =
            angleRadians;

        this.rotation =
            angleRadians;
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
