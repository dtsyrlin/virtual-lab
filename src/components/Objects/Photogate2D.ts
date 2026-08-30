import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
    Rectangle,
    Text,
} from "pixi.js";


export interface Photogate2DOptions {

    position: {
        x: number;
        y: number;
    };

    trackPosition: number;

    label?: string;

    beamHeight?: number;

    maxMeasurements?: number;

    onClear?: () => void;
}


export class Photogate2D extends Container {

    private readonly graphics =
        new Graphics();

    private readonly readingsText:
        Text;

    private readonly labelText:
        Text;

    private readonly clearButton =
        new Graphics();

    private readonly clearButtonText:
        Text;

    private _trackPosition:
        number;

    private readonly beamHeight:
        number;

    private readonly maxMeasurements:
        number;

    private readonly onClear?: () => void;

    private dragging =
        false;

    private dragOffset =
        new Point(
            0,
            0
        );

    private measurements:
        number[] =
        [];

    private onDragMove?: (
        point: Point
    ) => void;

    private onDragEnd?: (
        point: Point
    ) => void;


    constructor({
        position,

        trackPosition,

        label = "",

        beamHeight = 75,

        maxMeasurements = 3,

        onClear,
    }: Photogate2DOptions) {

        super();


        this._trackPosition =
            trackPosition;

        this.beamHeight =
            beamHeight;

        this.maxMeasurements =
            maxMeasurements;

        this.onClear =
            onClear;


        this.position.set(
            position.x,
            position.y
        );


        this.labelText =
            new Text({
                text:
                    label,

                style: {
                    fontSize: 15,
                    fontWeight: "bold",
                    fill: 0x000000,
                },
            });


        this.labelText.position.set(
            10,
            -this.beamHeight
        );


        this.readingsText =
            new Text({
                text: "",

                style: {
                    fontSize: 15,
                    fill: 0x000000,
                },
            });


        this.readingsText.position.set(
            10,
            8
        );


        this.clearButtonText =
            new Text({
                text: "C",

                style: {
                    fontSize: 12,
                    fill: 0x000000,
                },
            });


        this.clearButtonText.anchor.set(
            0.5
        );


        this.clearButton.position.set(
            62,
            10
        );


        this.clearButtonText.position.set(
            72,
            20
        );


        this.clearButton.eventMode =
            "static";

        this.clearButton.cursor =
            "pointer";


        this.clearButton.on(
            "pointerdown",
            (
                event:
                    FederatedPointerEvent
            ) => {

                event.stopPropagation();

                this.clearMeasurements();

                this.onClear?.();
            }
        );


        this.addChild(
            this.graphics
        );

        this.addChild(
            this.labelText
        );

        this.addChild(
            this.readingsText
        );

        this.addChild(
            this.clearButton
        );

        this.addChild(
            this.clearButtonText
        );


        this.eventMode =
            "static";

        this.cursor =
            "grab";


        this.hitArea =
            new Rectangle(
                -12,
                -this.beamHeight - 10,
                100,
                this.beamHeight + 80
            );


        this.draw();


        this.on(
            "pointerdown",
            this.handlePointerDown
        );

        this.on(
            "globalpointermove",
            this.handlePointerMove
        );

        this.on(
            "pointerup",
            this.handlePointerUp
        );

        this.on(
            "pointerupoutside",
            this.handlePointerUp
        );
    }


    private draw() {

        this.graphics.clear();


        this.graphics
            .rect(
                -2,
                -this.beamHeight,
                4,
                this.beamHeight
            )
            .fill(
                0xcc3333
            );


        this.graphics
            .rect(
                -7,
                -this.beamHeight - 7,
                14,
                7
            )
            .fill(
                0x555555
            );


        this.graphics
            .rect(
                -7,
                0,
                14,
                7
            )
            .fill(
                0x555555
            );


        this.clearButton.clear();


        this.clearButton
            .roundRect(
                0,
                0,
                20,
                20,
                4
            )
            .fill(
                0xf4f4f4
            )
            .stroke({
                width: 1,
                color: 0x666666,
            });
    }


    private getParentPoint(
        event:
            FederatedPointerEvent
    ): Point | null {

        const parent =
            this.parent;


        if (!parent) {
            return null;
        }


        return event.getLocalPosition(
            parent
        );
    }


    private handlePointerDown = (
        event:
            FederatedPointerEvent
    ) => {

        const point =
            this.getParentPoint(
                event
            );


        if (!point) {
            return;
        }


        this.dragging =
            true;

        this.cursor =
            "grabbing";


        this.dragOffset.set(
            point.x -
                this.position.x,

            point.y -
                this.position.y
        );
    };


    private handlePointerMove = (
        event:
            FederatedPointerEvent
    ) => {

        if (!this.dragging) {
            return;
        }


        const point =
            this.getParentPoint(
                event
            );


        if (!point) {
            return;
        }


        this.onDragMove?.(
            new Point(
                point.x -
                    this.dragOffset.x,

                point.y -
                    this.dragOffset.y
            )
        );
    };


    private handlePointerUp = (
        event:
            FederatedPointerEvent
    ) => {

        if (!this.dragging) {
            return;
        }


        const point =
            this.getParentPoint(
                event
            );


        if (!point) {
            return;
        }


        this.dragging =
            false;

        this.cursor =
            "grab";


        this.onDragEnd?.(
            new Point(
                point.x -
                    this.dragOffset.x,

                point.y -
                    this.dragOffset.y
            )
        );
    };


    public setOnDragMove(
        callback:
            (
                point: Point
            ) => void
    ) {

        this.onDragMove =
            callback;
    }


    public setOnDragEnd(
        callback:
            (
                point: Point
            ) => void
    ) {

        this.onDragEnd =
            callback;
    }


    public setTrackPosition(
        trackPosition:
            number
    ) {

        this._trackPosition =
            trackPosition;
    }


    public setTrackRotation(
        angleRadians:
            number
    ) {

        this.rotation =
            angleRadians;
    }


    public addMeasurement(
        seconds:
            number
    ) {

        if (
            this.measurements.length >=
            this.maxMeasurements
        ) {

            return;
        }


        this.measurements.push(
            seconds
        );


        this.updateReadings();
    }


    public clearMeasurements() {

        this.measurements =
            [];

        this.updateReadings();
    }


    private updateReadings() {

        this.readingsText.text =
            this.measurements
                .map(
                    value =>
                        `${value.toFixed(3)} s`
                )
                .join(
                    "\n"
                );
    }


    public get trackPosition():
        number {

        return this._trackPosition;
    }
}
