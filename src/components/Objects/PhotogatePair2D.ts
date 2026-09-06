import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
    Rectangle,
    Text,
} from "pixi.js";

export interface PhotogatePairGeometry {
    trackPosition: number;
    separationMeters: number;
    beamHeight: number;
}

export interface PhotogatePair2DOptions {
    position: { x: number; y: number };
    trackPosition: number;
    separationMeters: number;
    pixelsPerMeter: number;
    beamHeight?: number;
    onGeometryChange?: (geometry: PhotogatePairGeometry) => void;
}

type DragMode = "top" | "left" | "right" | null;

export class PhotogatePair2D extends Container {
    private readonly graphics = new Graphics();
    private readonly readingText: Text;
    private readingDragging = false;
    private readingDragOffset = new Point();
    private readonly leftHandle = new Graphics();
    private readonly rightHandle = new Graphics();
    private readonly topHandle = new Graphics();

    private readonly maxMeasurements = 1;
    private measurements: number[] = [];
    private runningSeconds: number | null = null;

    private _trackPosition: number;
    private _separationMeters: number;
    private _beamHeight: number;
    private readonly pixelsPerMeter: number;
    private readonly onGeometryChange?: (geometry: PhotogatePairGeometry) => void;

    private dragMode: DragMode = null;
    private dragStartPoint = new Point();

    // Factory / not-yet-attached mode: behave exactly like RollingObject2D.
    private detachedDragEnabled = false;
    private detachedDragging = false;
    private detachedDragOffset = new Point();
    private onDetachedDragStart?: (pair: PhotogatePair2D, point: Point) => void;
    private onDetachedDragMove?: (pair: PhotogatePair2D, point: Point) => void;
    private onDetachedDragEnd?: (pair: PhotogatePair2D, point: Point) => void;
    private dragStartTrackPosition = 0;
    private dragStartSeparation = 0;
    private dragStartHeight = 0;

    constructor({
        position,
        trackPosition,
        separationMeters,
        pixelsPerMeter,
        beamHeight = 75,
        onGeometryChange,
    }: PhotogatePair2DOptions) {
        super();
        this._trackPosition = trackPosition;
        this._separationMeters = separationMeters;
        this._beamHeight = beamHeight;
        this.pixelsPerMeter = pixelsPerMeter;
        this.onGeometryChange = onGeometryChange;
        this.position.set(position.x, position.y);

        this.readingText = new Text({
            text: "0.000",
            style: { fontFamily: "monospace", fontSize: 16, fill: 0x000000 },
        });
        this.readingText.anchor.set(0.5);
        this.readingText.eventMode = "static";
        this.readingText.cursor = "move";
        this.readingText.on("pointerdown", (event: FederatedPointerEvent) => {
            event.stopPropagation();
            const p = event.getLocalPosition(this);
            this.readingDragging = true;
            this.readingDragOffset.set(
                p.x - this.readingText.position.x,
                p.y - this.readingText.position.y
            );
        });

        this.readingText.on("globalpointermove", (event: FederatedPointerEvent) => {
            if (!this.readingDragging) return;

            const p = event.getLocalPosition(this);
            this.readingText.position.set(
                p.x - this.readingDragOffset.x,
                p.y - this.readingDragOffset.y
            );
        });

        const stopReadingDrag = () => {
            this.readingDragging = false;
        };

        this.readingText.on("pointerup", stopReadingDrag);
        this.readingText.on("pointerupoutside", stopReadingDrag);

        this.addChild(
            this.graphics,
            this.readingText,
            this.leftHandle,
            this.rightHandle,
            this.topHandle
        );

        this.leftHandle.eventMode = "static";
        this.leftHandle.cursor = "ew-resize";
        this.leftHandle.on("pointerdown", event => this.beginDrag(event, "left"));

        this.rightHandle.eventMode = "static";
        this.rightHandle.cursor = "ew-resize";
        this.rightHandle.on("pointerdown", event => this.beginDrag(event, "right"));

        this.topHandle.eventMode = "static";
        this.topHandle.cursor = "move";
        this.topHandle.on("pointerdown", event => this.beginDrag(event, "top"));

        this.eventMode = "static";
        this.cursor = "grab";
        this.on("pointerdown", event => {
            if (this.detachedDragEnabled) this.beginDrag(event, "top");
        });
        this.on("globalpointermove", this.handlePointerMove);
        this.on("pointerup", this.handlePointerUp);
        this.on("pointerupoutside", this.handlePointerUp);

        this.draw();
    }

    private draw(): void {
        const sepPx = this._separationMeters * this.pixelsPerMeter;
        const h = this._beamHeight;

        this.graphics.clear();
        this.graphics.rect(-2, -h, 4, h).fill(0xcc3333);
        this.graphics.rect(sepPx - 2, -h, 4, h).fill(0xcc3333);
        this.graphics.rect(-7, -h - 7, sepPx + 14, 7).fill(0x555555);
        this.graphics.rect(-7, 0, sepPx + 14, 7).fill(0x555555);

        const displayY = -h - 28;
        const displayCenterX = sepPx / 2;

        // Center the numeric reading over the gate.
        this.readingText.position.set(displayCenterX, displayY);

        // Invisible interaction zones. The beams themselves and the two
        // sides of the top rail resize the pair horizontally.
        this.leftHandle.clear();
        this.leftHandle.rect(-10, -h - 10, 20, h + 20).fill({ color: 0xffffff, alpha: 0.001 });

        this.rightHandle.clear();
        this.rightHandle.rect(sepPx - 10, -h - 10, 20, h + 20)
            .fill({ color: 0xffffff, alpha: 0.001 });

        // The center of the top rail moves the pair along the track when
        // dragged parallel to it, and changes gate height when dragged
        // perpendicular to the track.
        this.topHandle.clear();
        const topWidth = Math.max(10, sepPx - 28);
        this.topHandle.rect(14, -h - 16, topWidth, 24)
            .fill({ color: 0xffffff, alpha: 0.001 });

        this.hitArea = new Rectangle(-14, -h - 18, sepPx + 70, h + 105);
    }

    public get leftBeamPosition(): number {
        return this._trackPosition;
    }

    public get rightBeamPosition(): number {
        return this._trackPosition + this._separationMeters;
    }

    public get trackPosition(): number {
        return this._trackPosition;
    }

    public get separationMeters(): number {
        return this._separationMeters;
    }

    public get beamHeight(): number {
        return this._beamHeight;
    }

    public setGeometry(geometry: PhotogatePairGeometry): void {
        this._trackPosition = geometry.trackPosition;
        this._separationMeters = geometry.separationMeters;
        this._beamHeight = geometry.beamHeight;
        this.draw();
    }

    public setTrackRotation(angleRadians: number): void {
        this.rotation = angleRadians;
        this.readingText.rotation = -angleRadians;
    }

    public setElapsed(seconds: number): void {
        this.runningSeconds = Math.abs(seconds);
        this.updateReadings();
    }

    public addMeasurement(seconds: number): void {
        if (this.measurements.length < this.maxMeasurements) {
            this.measurements.push(Math.abs(seconds));
        }
        this.runningSeconds = null;
        this.updateReadings();
    }

    public stopRunningDisplay(): void {
        this.runningSeconds = null;
        this.updateReadings();
    }

    public clear(): void {
        this.measurements = [];
        this.runningSeconds = null;
        this.updateReadings();
    }

    private updateReadings(): void {
        const lines = this.measurements.map(value => value.toFixed(3));
        if (this.runningSeconds !== null && lines.length < this.maxMeasurements) {
            lines.push(this.runningSeconds.toFixed(3));
        }
        this.readingText.text = lines.length > 0 ? lines.join("\n") : "0.000";
    }

    public setDetachedDragEnabled(enabled: boolean): void {
        this.detachedDragEnabled = enabled;
        this.cursor = enabled ? "grab" : "default";
    }

    public setOnDetachedDragStart(
        callback: (pair: PhotogatePair2D, point: Point) => void
    ): void {
        this.onDetachedDragStart = callback;
    }

    public setOnDetachedDragMove(
        callback: (pair: PhotogatePair2D, point: Point) => void
    ): void {
        this.onDetachedDragMove = callback;
    }

    public setOnDetachedDragEnd(
        callback: (pair: PhotogatePair2D, point: Point) => void
    ): void {
        this.onDetachedDragEnd = callback;
    }

    public beginTopDrag(event: FederatedPointerEvent): void {
        this.beginDrag(event, "top");
    }

    private beginDrag(event: FederatedPointerEvent, mode: Exclude<DragMode, null>): void {
        event.stopPropagation();
        if (!this.parent) return;

        const point = event.getLocalPosition(this.parent);

        if (this.detachedDragEnabled) {
            this.detachedDragging = true;
            this.cursor = "grabbing";
            this.detachedDragOffset.set(
                point.x - this.position.x,
                point.y - this.position.y
            );
            this.onDetachedDragStart?.(this, point);
            return;
        }

        this.dragMode = mode;
        this.dragStartPoint.copyFrom(point);
        this.dragStartTrackPosition = this._trackPosition;
        this.dragStartSeparation = this._separationMeters;
        this.dragStartHeight = this._beamHeight;
    }

    private handlePointerMove = (event: FederatedPointerEvent) => {
        if (!this.parent) return;

        if (this.detachedDragging) {
            const point = event.getLocalPosition(this.parent);
            const draggedPoint = new Point(
                point.x - this.detachedDragOffset.x,
                point.y - this.detachedDragOffset.y
            );
            this.position.copyFrom(draggedPoint);
            this.onDetachedDragMove?.(this, draggedPoint);
            return;
        }

        if (!this.dragMode) return;

        const point = event.getLocalPosition(this.parent);
        const dxScreen = point.x - this.dragStartPoint.x;
        const dyScreen = point.y - this.dragStartPoint.y;

        const c = Math.cos(this.rotation);
        const s = Math.sin(this.rotation);
        const dxLocal = dxScreen * c + dyScreen * s;
        const dyLocal = -dxScreen * s + dyScreen * c;

        let trackPosition = this.dragStartTrackPosition;
        let separationMeters = this.dragStartSeparation;
        let beamHeight = this.dragStartHeight;

        if (this.dragMode === "top") {
            trackPosition += dxLocal / this.pixelsPerMeter;
            beamHeight -= dyLocal;
        } else if (this.dragMode === "left") {
            const fixedRight =
                this.dragStartTrackPosition + this.dragStartSeparation;
            trackPosition += dxLocal / this.pixelsPerMeter;
            separationMeters = fixedRight - trackPosition;
        } else if (this.dragMode === "right") {
            separationMeters += dxLocal / this.pixelsPerMeter;
        }

        this.onGeometryChange?.({
            trackPosition,
            separationMeters,
            beamHeight,
        });
    };

    private handlePointerUp = (event: FederatedPointerEvent) => {
        if (this.detachedDragging) {
            const point = this.parent
                ? event.getLocalPosition(this.parent)
                : null;
            this.detachedDragging = false;
            this.cursor = this.detachedDragEnabled ? "grab" : "default";

            if (point) {
                this.onDetachedDragEnd?.(
                    this,
                    new Point(
                        point.x - this.detachedDragOffset.x,
                        point.y - this.detachedDragOffset.y
                    )
                );
            }
            return;
        }

        this.dragMode = null;
    };
}

