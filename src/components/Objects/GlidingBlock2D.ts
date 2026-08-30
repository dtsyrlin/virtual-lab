import {
    Container,
    Graphics,
    Text,
    FederatedPointerEvent,
    Point,
} from "pixi.js";


export interface GlidingBlock2DOptions {

    id: string;

    position: {
        x: number;
        y: number;
    };

    mass?: number;

    width?: number;
    height?: number;

    label?: string;
}


export class GlidingBlock2D extends Container {

    public readonly id: string;

    private _mass: number;

    public readonly blockWidth: number;
    public readonly blockHeight: number;

    private readonly body: Graphics;
    private readonly massText: Text;

    private dragging = false;

    private dragOffset =
        new Point(
            0,
            0
        );

    private onDragStart?: (
        block: GlidingBlock2D,
        point: Point
    ) => void;

    private onDragMove?: (
        block: GlidingBlock2D,
        point: Point
    ) => void;

    private onDragEnd?: (
        block: GlidingBlock2D,
        point: Point
    ) => void;


    constructor({
        id,
        position,

        mass = 1,

        width = 70,
        height = 50,

        label,
    }: GlidingBlock2DOptions) {

        super();


        this.id =
            id;

        this._mass =
            mass;

        this.blockWidth =
            width;

        this.blockHeight =
            height;


        this.position.set(
            position.x,
            position.y
        );


        this.body =
            new Graphics()
                .roundRect(
                    -this.blockWidth / 2,
                    -this.blockHeight / 2,
                    this.blockWidth,
                    this.blockHeight,
                    6
                )
                .fill(
                    0xd9d9d9
                )
                .stroke({
                    width: 2,
                    color: 0x333333,
                });


        this.addChild(
            this.body
        );


        this.massText =
            new Text({
                text:
                    label ??
                    `${this._mass} kg`,

                style: {
                    fontSize: 17,
                    fill: 0x000000,
                },
            });


        this.massText.anchor.set(
            0.5
        );


        this.addChild(
            this.massText
        );


        this.eventMode =
            "static";

        this.cursor =
            "grab";


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


    private getParentPoint(
        event: FederatedPointerEvent
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
        event: FederatedPointerEvent
    ) => {

        const parentPoint =
            this.getParentPoint(
                event
            );


        if (!parentPoint) {
            return;
        }


        this.dragging =
            true;

        this.cursor =
            "grabbing";


        this.dragOffset.set(
            parentPoint.x -
                this.position.x,

            parentPoint.y -
                this.position.y
        );


        this.onDragStart?.(
            this,
            new Point(
                parentPoint.x,
                parentPoint.y
            )
        );
    };


    private handlePointerMove = (
        event: FederatedPointerEvent
    ) => {

        if (!this.dragging) {
            return;
        }


        const parentPoint =
            this.getParentPoint(
                event
            );


        if (!parentPoint) {
            return;
        }


        const dragPoint =
            new Point(
                parentPoint.x -
                    this.dragOffset.x,

                parentPoint.y -
                    this.dragOffset.y
            );


        this.onDragMove?.(
            this,
            dragPoint
        );
    };


    private handlePointerUp = (
        event: FederatedPointerEvent
    ) => {

        if (!this.dragging) {
            return;
        }


        const parentPoint =
            this.getParentPoint(
                event
            );


        if (!parentPoint) {
            return;
        }


        this.dragging =
            false;

        this.cursor =
            "grab";


        const dragPoint =
            new Point(
                parentPoint.x -
                    this.dragOffset.x,

                parentPoint.y -
                    this.dragOffset.y
            );


        this.onDragEnd?.(
            this,
            dragPoint
        );
    };


    public setOnDragStart(
        callback: (
            block: GlidingBlock2D,
            point: Point
        ) => void
    ) {

        this.onDragStart =
            callback;
    }


    public setOnDragMove(
        callback: (
            block: GlidingBlock2D,
            point: Point
        ) => void
    ) {

        this.onDragMove =
            callback;
    }


    public setOnDragEnd(
        callback: (
            block: GlidingBlock2D,
            point: Point
        ) => void
    ) {

        this.onDragEnd =
            callback;
    }


    public setMass(
        mass: number,
        label?: string
    ) {

        this._mass =
            mass;


        this.massText.text =
            label ??
            `${mass} kg`;
    }


    public setDisplayLabel(
        label: string
    ) {

        this.massText.text =
            label;
    }


    public setTrackRotation(
        angleRadians: number
    ) {

        this.rotation =
            angleRadians;
    }


    public get mass(): number {

        return this._mass;
    }


    public get isDragging(): boolean {

        return this.dragging;
    }
}
