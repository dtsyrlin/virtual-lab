import {
  Container,
  FederatedPointerEvent,
  Graphics,
} from "pixi.js";

export type BallState =
  | "dragging"
  | "falling"
  | "resting";

export class Ball2D extends Container {
  public xMeters: number;
  public yMeters: number;

  public readonly radiusMeters: number;
  public state: BallState = "resting";

  private readonly pixelsPerMeter: number;
  private readonly bottomYMeters: number;

  private dragOffsetX = 0;
  private dragOffsetY = 0;

  public onDropped?: (
    initialY: number,
    bottomY: number
  ) => void;  

  constructor(
    xMeters: number,
    yMeters: number,
    radiusMeters: number,
    bottomYMeters: number,
    pixelsPerMeter: number
  ) {
    super();

    this.xMeters = xMeters;
    this.yMeters = yMeters;

    this.radiusMeters = radiusMeters;
    this.bottomYMeters = bottomYMeters;
    this.pixelsPerMeter = pixelsPerMeter;

    const radiusPixels =
      radiusMeters * pixelsPerMeter;

    const ball = new Graphics();

    ball
      .circle(0, 0, radiusPixels)
      .fill({
        color: 0xc0c0c0,
      })
      .stroke({
        color: 0x555555,
        width: 2,
      });

    this.addChild(ball);

    this.updateScreenPosition();

    /*
     * The ball moves, so "dynamic" is appropriate.
     */
    this.eventMode = "dynamic";
    this.cursor = "grab";

    this.on(
      "pointerdown",
      this.handlePointerDown,
      this
    );

    this.on(
      "globalpointermove",
      this.handlePointerMove,
      this
    );

    this.on(
      "pointerup",
      this.handlePointerUp,
      this
    );

    this.on(
      "pointerupoutside",
      this.handlePointerUp,
      this
    );
  }

  private handlePointerDown(
    event: FederatedPointerEvent
  ): void {
    if (this.parent === null) {
      return;
    }

    this.state = "dragging";
    this.cursor = "grabbing";

    const pointer =
      event.getLocalPosition(this.parent);

    this.dragOffsetX =
      pointer.x - this.position.x;

    this.dragOffsetY =
      pointer.y - this.position.y;
  }

  private handlePointerMove(
    event: FederatedPointerEvent
  ): void {
    if (
      this.state !== "dragging" ||
      this.parent === null
    ) {
      return;
    }

    const pointer =
      event.getLocalPosition(this.parent);

    const newX =
      (pointer.x - this.dragOffsetX) /
      this.pixelsPerMeter;

    let newY =
      (pointer.y - this.dragOffsetY) /
      this.pixelsPerMeter;

    /*
     * The center of the ball cannot go below:
     *
     * table surface - ball radius
     */
    const lowestCenterY =
      this.bottomYMeters -
      this.radiusMeters;

    if (newY > lowestCenterY) {
      newY = lowestCenterY;
    }

    this.setPositionMeters(
      newX,
      newY
    );
  }

  private handlePointerUp(): void {
    if (this.state !== "dragging") {
      return;
    }

    this.cursor = "grab";

    const lowestCenterY =
      this.bottomYMeters -
      this.radiusMeters;

    /*
     * If released on the bottom,
     * don't start physics.
     */
    if (this.yMeters >= lowestCenterY) {
      this.yMeters = lowestCenterY;
      this.state = "resting";

      this.updateScreenPosition();
    }
    else {
      /*
       * Released above the bottom:
       * physics should take control.
       */
      this.state = "falling";
      this.onDropped?.(
        this.yMeters,
        this.bottomYMeters - this.radiusMeters
      );      
    }
  }

  public setPositionMeters(
    xMeters: number,
    yMeters: number
  ): void {
    this.xMeters = xMeters;
    this.yMeters = yMeters;

    this.updateScreenPosition();
  }

  private updateScreenPosition(): void {
    this.position.set(
      this.xMeters * this.pixelsPerMeter,
      this.yMeters * this.pixelsPerMeter
    );
  }
}