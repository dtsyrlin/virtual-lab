import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";

export type Point2D = {
  x: number;
  y: number;
};

export type RulerOrientation =
  | "horizontal"
  | "vertical";

/**
 * A visual two-dimensional ruler.
 *
 * This class contains no physics.
 *
 * The ruler's position and rotation are screen properties
 * managed by PixiJS.
 */
export class Ruler2D extends Container {
  public readonly lengthMeters: number;
  public readonly pixelsPerMeter: number;

  private readonly rulerWidthPixels = 50;
  private readonly rotationHandleRadius = 10;

  /*
   * True while the ruler is being dragged.
   */
  private isDragging = false;

  /*
   * True while the rotation handle is being dragged.
   */
  private isRotating = false;

  /*
   * Difference between the pointer position and ruler position
   * when dragging begins.
   *
   * This prevents the ruler from jumping so that its origin
   * is directly under the mouse.
   */
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private readonly rotationHandle: Graphics;

  constructor(
    lengthMeters: number,
    initialPosition: Point2D,
    pixelsPerMeter: number,
    orientation: RulerOrientation = "vertical"
  ) {
    super();

    if (lengthMeters <= 0) {
      throw new Error(
        "Ruler length must be greater than zero."
      );
    }

    if (pixelsPerMeter <= 0) {
      throw new Error(
        "pixelsPerMeter must be greater than zero."
      );
    }

    this.lengthMeters = lengthMeters;
    this.pixelsPerMeter = pixelsPerMeter;

    /*
     * Set the initial screen position.
     *
     * The ruler's origin is its bottom-left corner.
     */
    this.position.set(
      initialPosition.x,
      initialPosition.y
    );

    /*
     * Draw the ruler body, marks, and labels.
     */
    this.drawRuler();

    /*
     * Create the rotation handle.
     */
    this.rotationHandle =
      this.createRotationHandle();

    this.addChild(this.rotationHandle);

    /*
     * Set the requested initial orientation.
     */
    if (orientation === "horizontal") {
      this.setHorizontal();
    } else {
      this.setVertical();
    }

    /*
     * Enable mouse and touch interaction.
     */
    this.enableInteraction();
  }

  private drawRuler(): void {
    const rulerLengthPixels =
      this.lengthMeters * this.pixelsPerMeter;

    const centimeters =
      Math.round(this.lengthMeters * 100);

    const pixelsPerCentimeter =
      this.pixelsPerMeter / 100;

    this.drawBody(rulerLengthPixels);

    this.drawCentimeterTicks(
      centimeters,
      pixelsPerCentimeter
    );
  }

  private drawBody(
    rulerLengthPixels: number
  ): void {
    const body = new Graphics();

    /*
     * The ruler's origin is its bottom-left corner.
     *
     * In screen coordinates:
     *
     * positive x goes right;
     * positive y goes down.
     *
     * Therefore, a vertical ruler extends upward
     * using negative y values.
     */
    body
      .rect(
        0,
        -rulerLengthPixels,
        this.rulerWidthPixels,
        rulerLengthPixels
      )
      .fill({
        color: 0xf2d184,
      })
      .stroke({
        color: 0x3a3020,
        width: 2,
      });

    this.addChild(body);
  }

  private drawCentimeterTicks(
    centimeters: number,
    pixelsPerCentimeter: number
  ): void {
    const tickGraphics = new Graphics();

    for (
      let centimeter = 0;
      centimeter <= centimeters;
      centimeter++
    ) {
      const y =
        -centimeter * pixelsPerCentimeter;

      const isTenCentimeterMark =
        centimeter % 10 === 0;

      const isFiveCentimeterMark =
        centimeter % 5 === 0;

      let tickLength = 12;

      if (isTenCentimeterMark) {
        tickLength = 30;
      } else if (isFiveCentimeterMark) {
        tickLength = 20;
      }

      tickGraphics
        .moveTo(
          this.rulerWidthPixels,
          y
        )
        .lineTo(
          this.rulerWidthPixels - tickLength,
          y
        );
    }

    tickGraphics.stroke({
      color: 0x201a10,
      width: 1,
    });

    this.addChild(tickGraphics);

    this.drawLabels(
      centimeters,
      pixelsPerCentimeter
    );
  }

  private drawLabels(
    centimeters: number,
    pixelsPerCentimeter: number
  ): void {
    const labelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 11,
      fill: 0x201a10,
    });

    for (
      let centimeter = 10;
      centimeter < centimeters;
      centimeter += 10
    ) {
      const label = new Text({
        text: centimeter.toString(),
        style: labelStyle,
      });

      label.position.set(
        3,
        -centimeter * pixelsPerCentimeter - 7
      );

      this.addChild(label);
    }
  }

  private createRotationHandle(): Graphics {
    const rulerLengthPixels =
      this.lengthMeters * this.pixelsPerMeter;

    const handle = new Graphics();

    /*
     * Place the handle at the center of
     * the ruler's upper end.
     */
    handle.position.set(
      this.rulerWidthPixels / 2,
      -rulerLengthPixels
    );

    handle
      .circle(
        0,
        0,
        this.rotationHandleRadius
      )
      .fill({
        color: 0x000000,
        alpha: 0,
      });

    /*
     * The handle receives pointer events.
     */
    handle.eventMode = "static";

    /*
     * This produces an appropriate cursor
     * when the pointer is over the handle.
     */
    handle.cursor = "grab";

    return handle;
  }

  private enableInteraction(): void {
    /*
     * Make the entire ruler interactive.
     */
    this.eventMode = "static";
    this.cursor = "grab";

    /*
     * Begin dragging the ruler.
     */
    this.on(
      "pointerdown",
      this.handlePointerDown,
      this
    );

    /*
     * Begin rotating when the handle is pressed.
     *
     * stopPropagation() prevents the same click
     * from also starting ordinary ruler dragging.
     */
    this.rotationHandle.on(
      "pointerdown",
      this.handleRotationPointerDown,
      this
    );

    /*
     * globalpointermove continues reporting pointer
     * movement even when the pointer is no longer
     * directly over the ruler.
     */
    this.on(
      "globalpointermove",
      this.handlePointerMove,
      this
    );

    /*
     * Finish dragging or rotation when released.
     */
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
    /*
     * Do nothing if rotation has already started.
     */
    if (this.isRotating) {
      return;
    }

    /*
     * A ruler should normally have a parent,
     * such as app.stage.
     */
    if (this.parent === null) {
      return;
    }

    this.isDragging = true;
    this.cursor = "grabbing";

    /*
     * Convert the pointer position into the
     * coordinate system of the ruler's parent.
     *
     * The ruler's own position is also expressed
     * in its parent's coordinate system.
     */
    const pointerPosition =
      event.getLocalPosition(this.parent);

    this.dragOffsetX =
      pointerPosition.x - this.position.x;

    this.dragOffsetY =
      pointerPosition.y - this.position.y;
  }

  private handleRotationPointerDown(
    event: FederatedPointerEvent
  ): void {
    /*
     * Prevent this event from bubbling to the ruler
     * and starting ordinary dragging.
     */
    event.stopPropagation();

    this.isDragging = false;
    this.isRotating = true;

    this.rotationHandle.cursor = "grabbing";
  }

  private handlePointerMove(
    event: FederatedPointerEvent
  ): void {
    if (this.parent === null) {
      return;
    }

    if (this.isDragging) {
      this.moveWithPointer(event);
      return;
    }

    if (this.isRotating) {
      this.rotateWithPointer(event);
    }
  }

  private moveWithPointer(
    event: FederatedPointerEvent
  ): void {
    if (this.parent === null) {
      return;
    }

    const pointerPosition =
      event.getLocalPosition(this.parent);

    this.position.set(
      pointerPosition.x - this.dragOffsetX,
      pointerPosition.y - this.dragOffsetY
    );
  }

  private rotateWithPointer(
    event: FederatedPointerEvent
  ): void {
    if (this.parent === null) {
      return;
    }

    /*
     * Both the pointer and the ruler's origin must
     * be expressed in the same coordinate system.
     */
    const pointerPosition =
      event.getLocalPosition(this.parent);

    const differenceX =
      pointerPosition.x - this.position.x;

    const differenceY =
      pointerPosition.y - this.position.y;

    /*
     * atan2 gives the angle from the positive
     * horizontal x-axis to the pointer.
     */
    const pointerAngle = Math.atan2(
      differenceY,
      differenceX
    );

    /*
     * Our ruler points upward when rotation is zero.
     *
     * atan2 considers the positive x-axis to be zero,
     * so we add PI / 2 to align the ruler's upward
     * direction with the pointer.
     */
    this.rotation =
      pointerAngle + Math.PI / 2;
  }

  private handlePointerUp(): void {
    this.isDragging = false;
    this.isRotating = false;

    this.cursor = "grab";
    this.rotationHandle.cursor = "grab";
  }

  public setVertical(): void {
    this.rotation = 0;
  }

  public setHorizontal(): void {
    this.rotation = Math.PI / 2;
  }
}