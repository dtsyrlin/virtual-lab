import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
    Rectangle,
} from "pixi.js";

export type RollingObjectKind =
    | "block"
    | "ring"
    | "double-ring"
    | "thick-ring"
    | "disk";

export interface RollingObject2DOptions {
    id: string;
    kind: RollingObjectKind;
    position: { x: number; y: number };
    radius?: number;
}

export class RollingObject2D extends Container {
    public readonly id: string;
    public readonly kind: RollingObjectKind;
    public readonly mass = 1;
    public readonly radiusPixels: number;

    private readonly graphics = new Graphics();
    private dragging = false;
    private dragOffset = new Point();
    private onDragStart?: (object: RollingObject2D, point: Point) => void;
    private onDragMove?: (object: RollingObject2D, point: Point) => void;
    private onDragEnd?: (object: RollingObject2D, point: Point) => void;

    constructor({
        id,
        kind,
        position,
        radius = 30,
    }: RollingObject2DOptions) {
        super();

        this.id = id;
        this.kind = kind;
        this.radiusPixels = radius;
        this.position.set(position.x, position.y);

        this.addChild(this.graphics);

        this.eventMode = "static";
        this.cursor = "grab";
        this.hitArea = new Rectangle(
            -radius - 8,
            -radius - 8,
            2 * radius + 16,
            2 * radius + 16
        );

        this.draw();

        this.on("pointerdown", this.handlePointerDown);
        this.on("globalpointermove", this.handlePointerMove);
        this.on("pointerup", this.handlePointerUp);
        this.on("pointerupoutside", this.handlePointerUp);
    }

    private draw(): void {
        const g = this.graphics;
        const r = this.radiusPixels;
        const edgeColor = 0x333333;
        const darkGray = 0x666666;
        const ringWidth = 5;
        const thinBorderWidth = 1.5;
        g.clear();

        if (this.kind === "block") {
            g.rect(-r, -r, 2 * r, 2 * r)
                .fill(darkGray)
                .stroke({ color: edgeColor, width: thinBorderWidth });
            return;
        }

        if (this.kind === "disk") {
            g.circle(0, 0, r)
                .fill(darkGray)
                .stroke({ color: edgeColor, width: thinBorderWidth });
        } else if (this.kind === "ring") {
            g.circle(0, 0, r)
                .stroke({ color: edgeColor, width: ringWidth });
        } else if (this.kind === "thick-ring") {
            // Draw the annulus as a thick circular stroke rather than filling
            // the center white. The center therefore remains genuinely
            // transparent, so a photogate laser behind it is visible through
            // the hole.
            g.circle(0, 0, 3 * r / 4)
                .stroke({ color: darkGray, width: r / 2 });
            g.circle(0, 0, r)
                .stroke({ color: edgeColor, width: thinBorderWidth });
            g.circle(0, 0, r / 2)
                .stroke({ color: edgeColor, width: thinBorderWidth });
        } else {
            g.circle(0, 0, r)
                .stroke({ color: edgeColor, width: 4 });
            g.circle(0, 0, r / 2)
                .stroke({ color: edgeColor, width: 4 });
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2;
                g.moveTo(
                    Math.cos(a) * r / 2,
                    Math.sin(a) * r / 2
                ).lineTo(
                    Math.cos(a) * r,
                    Math.sin(a) * r
                ).stroke({ color: 0x555555, width: 2 });
            }
        }

        // One conspicuous rim marker for counting revolutions.
        // Keep the marker fully inside filled circular objects.
        const markerY =
            this.kind === "disk" || this.kind === "thick-ring"
                ? -(r - 5)
                : -r;
        g.circle(0, markerY, 4).fill(0xcc2222);
    }

    public setTrackPose(
        trackAngle: number,
        angularPosition: number
    ): void {
        this.rotation = trackAngle + angularPosition;
    }

    public setOnDragStart(callback: (object: RollingObject2D, point: Point) => void) {
        this.onDragStart = callback;
    }

    public setOnDragMove(callback: (object: RollingObject2D, point: Point) => void) {
        this.onDragMove = callback;
    }

    public setOnDragEnd(callback: (object: RollingObject2D, point: Point) => void) {
        this.onDragEnd = callback;
    }

    public get isDragging(): boolean {
        return this.dragging;
    }

    private getParentPoint(event: FederatedPointerEvent): Point | null {
        if (!this.parent) return null;
        return event.getLocalPosition(this.parent);
    }

    private handlePointerDown = (event: FederatedPointerEvent) => {
        const point = this.getParentPoint(event);
        if (!point) return;
        this.dragging = true;
        this.cursor = "grabbing";
        this.dragOffset.set(
            point.x - this.position.x,
            point.y - this.position.y
        );
        this.onDragStart?.(this, point);
    };

    private handlePointerMove = (event: FederatedPointerEvent) => {
        if (!this.dragging) return;
        const point = this.getParentPoint(event);
        if (!point) return;
        this.onDragMove?.(
            this,
            new Point(
                point.x - this.dragOffset.x,
                point.y - this.dragOffset.y
            )
        );
    };

    private handlePointerUp = (event: FederatedPointerEvent) => {
        if (!this.dragging) return;
        const point = this.getParentPoint(event);
        this.dragging = false;
        this.cursor = "grab";
        if (!point) return;
        this.onDragEnd?.(
            this,
            new Point(
                point.x - this.dragOffset.x,
                point.y - this.dragOffset.y
            )
        );
    };
}
