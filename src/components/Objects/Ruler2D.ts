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
 * This class contains no drawing behavior
 * and no physics.
 *
 * The ruler can be dragged and rotated.
 */
export class Ruler2D extends Container {
  public readonly lengthMeters: number;
  public readonly pixelsPerMeter: number;

  private readonly rulerWidthPixels = 50;
  private readonly rotationHandleRadius = 18;

  private isDragging = false;
  private isRotating = false;

  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private rotationStartPointerAngle = 0;
  private rotationStartRulerAngle = 0;

  private rotationPivotLocalX = 0;
  private rotationPivotLocalY = 0;

  private rotationPivotParentX = 0;
  private rotationPivotParentY = 0;

  private readonly topRotationHandle: Graphics;
  private readonly bottomRotationHandle: Graphics;

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

    this.lengthMeters =
      lengthMeters;

    this.pixelsPerMeter =
      pixelsPerMeter;

    /*
     * Ruler origin is its bottom-left corner.
     */
    this.position.set(
      initialPosition.x,
      initialPosition.y
    );

    this.drawRuler();

    /*
     * Invisible rotation handles.
     *
     * The grabbing locations are centered
     * on the two ends of the ruler.
     */
    this.topRotationHandle =
      this.createRotationHandle(
        "top"
      );

    this.bottomRotationHandle =
      this.createRotationHandle(
        "bottom"
      );

    this.addChild(
      this.topRotationHandle
    );

    this.addChild(
      this.bottomRotationHandle
    );

    if (
      orientation === "horizontal"
    ) {
      this.setHorizontal();
    } else {
      this.setVertical();
    }

    this.enableInteraction();
  }

  private get rulerLengthPixels(): number {
    return (
      this.lengthMeters *
      this.pixelsPerMeter
    );
  }

  // ==================================================
  // DRAW RULER
  // ==================================================

  private drawRuler(): void {
    const centimeters =
      Math.round(
        this.lengthMeters * 100
      );

    const pixelsPerCentimeter =
      this.pixelsPerMeter / 100;

    this.drawBody(
      this.rulerLengthPixels
    );

    this.drawCentimeterTicks(
      centimeters,
      pixelsPerCentimeter
    );
  }

  private drawBody(
    rulerLengthPixels: number
  ): void {
    const body =
      new Graphics();

    /*
     * Local ruler coordinates:
     *
     * bottom-left = (0, 0)
     *
     * The ruler extends upward,
     * therefore y is negative.
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
    const tickGraphics =
      new Graphics();

    for (
      let centimeter = 0;
      centimeter <= centimeters;
      centimeter++
    ) {
      const y =
        -centimeter *
        pixelsPerCentimeter;

      const isTenCentimeterMark =
        centimeter % 10 === 0;

      const isFiveCentimeterMark =
        centimeter % 5 === 0;

      let tickLength = 12;

      if (
        isTenCentimeterMark
      ) {
        tickLength = 30;
      } else if (
        isFiveCentimeterMark
      ) {
        tickLength = 20;
      }

      tickGraphics
        .moveTo(
          this.rulerWidthPixels,
          y
        )
        .lineTo(
          this.rulerWidthPixels -
            tickLength,
          y
        );
    }

    tickGraphics.stroke({
      color: 0x201a10,
      width: 1,
    });

    this.addChild(
      tickGraphics
    );

    this.drawLabels(
      centimeters,
      pixelsPerCentimeter
    );
  }

  private drawLabels(
    centimeters: number,
    pixelsPerCentimeter: number
  ): void {
    const labelStyle =
      new TextStyle({
        fontFamily: "Arial",
        fontSize: 11,
        fill: 0x201a10,
      });

    /*
     * Start at 10 and stop before the
     * ruler's maximum length.
     *
     * Therefore there is no 0 or final
     * endpoint label.
     */
    for (
      let centimeter = 10;
      centimeter < centimeters;
      centimeter += 10
    ) {
      const label =
        new Text({
          text:
            centimeter.toString(),
          style:
            labelStyle,
        });

      label.position.set(
        3,
        -centimeter *
          pixelsPerCentimeter -
          7
      );

      this.addChild(label);
    }
  }

  // ==================================================
  // ROTATION HANDLES
  // ==================================================

  private createRotationHandle(
    end: "top" | "bottom"
  ): Graphics {
    const handle =
      new Graphics();

    /*
     * IMPORTANT:
     *
     * The grab points remain in the MIDDLE
     * of the ruler ends.
     *
     * These are NOT the rotation pivots.
     */
    if (
      end === "top"
    ) {
      handle.position.set(
        this.rulerWidthPixels / 2,
        -this.rulerLengthPixels
      );
    } else {
      handle.position.set(
        this.rulerWidthPixels / 2,
        0
      );
    }

    /*
     * Invisible circular hit area.
     */
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

    handle.eventMode =
      "static";

    handle.cursor =
      "grab";

    return handle;
  }

  // ==================================================
  // INTERACTION
  // ==================================================

  private enableInteraction(): void {
    this.eventMode =
      "static";

    this.cursor =
      "grab";

    /*
     * Drag ruler by its body.
     */
    this.on(
      "pointerdown",
      this.handlePointerDown,
      this
    );

    /*
     * Rotation handles.
     *
     * stopPropagation prevents grabbing an
     * end from also starting normal dragging.
     */
    this.topRotationHandle.on(
      "pointerdown",
      (event) => {
        event.stopPropagation();

        this.handleRotationPointerDown(
          event,
          "top"
        );
      }
    );

    this.bottomRotationHandle.on(
      "pointerdown",
      (event) => {
        event.stopPropagation();

        this.handleRotationPointerDown(
          event,
          "bottom"
        );
      }
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

  // ==================================================
  // DRAGGING
  // ==================================================
private handlePointerDown(
  event: FederatedPointerEvent
): void {

  /*
   * Left mouse button only.
   */
  if (
    event.button !== 0
  ) {
    return;
  }


  /*
   * The ruler is an independent
   * measuring tool.
   *
   * Using it must NOT trigger the
   * experiment's global left-click
   * behavior.
   */
  event.stopPropagation();


  if (
    this.isRotating
  ) {
    return;
  }


  if (
    this.parent === null
  ) {
    return;
  }


  this.isDragging =
    true;


  this.cursor =
    "grabbing";


  const pointerPosition =
    event.getLocalPosition(
      this.parent
    );


  /*
   * Preserve where on the ruler the
   * user grabbed it.
   */
  this.dragOffsetX =
    pointerPosition.x -
    this.position.x;


  this.dragOffsetY =
    pointerPosition.y -
    this.position.y;
}

  private moveWithPointer(
    event: FederatedPointerEvent
  ): void {
    if (
      this.parent === null
    ) {
      return;
    }

    const pointerPosition =
      event.getLocalPosition(
        this.parent
      );

    this.position.set(
      pointerPosition.x -
        this.dragOffsetX,

      pointerPosition.y -
        this.dragOffsetY
    );
  }

  // ==================================================
  // ROTATION
  // ==================================================

  private handleRotationPointerDown(
    event: FederatedPointerEvent,
    grabbedEnd:
      | "top"
      | "bottom"
  ): void {
    /*
     * Left mouse button only.
     */
    if (
      event.button !== 0
    ) {
      return;
    }

    if (
      this.parent === null
    ) {
      return;
    }

    this.isDragging =
      false;

    this.isRotating =
      true;

    /*
     * This is the important behavior we
     * established earlier:
     *
     * Grab TOP end:
     * rotate around BOTTOM-RIGHT corner.
     *
     * Grab BOTTOM end:
     * rotate around TOP-RIGHT corner.
     *
     * "Right" means the ruler edge containing
     * the centimeter tick marks.
     */
    if (
      grabbedEnd === "top"
    ) {
      this.rotationPivotLocalX =
        this.rulerWidthPixels;

      this.rotationPivotLocalY =
        0;
    } else {
      this.rotationPivotLocalX =
        this.rulerWidthPixels;

      this.rotationPivotLocalY =
        -this.rulerLengthPixels;
    }

    /*
     * Convert the local pivot into the
     * parent's coordinate system.
     */
    const cos =
      Math.cos(
        this.rotation
      );

    const sin =
      Math.sin(
        this.rotation
      );

    this.rotationPivotParentX =
      this.position.x +
      this.rotationPivotLocalX *
        cos -
      this.rotationPivotLocalY *
        sin;

    this.rotationPivotParentY =
      this.position.y +
      this.rotationPivotLocalX *
        sin +
      this.rotationPivotLocalY *
        cos;

    const pointerPosition =
      event.getLocalPosition(
        this.parent
      );

    /*
     * Remember the initial pointer angle.
     *
     * This allows rotation to begin smoothly
     * without making the ruler jump.
     */
    this.rotationStartPointerAngle =
      Math.atan2(
        pointerPosition.y -
          this.rotationPivotParentY,

        pointerPosition.x -
          this.rotationPivotParentX
      );

    this.rotationStartRulerAngle =
      this.rotation;

    this.topRotationHandle.cursor =
      "grabbing";

    this.bottomRotationHandle.cursor =
      "grabbing";
  }

  private rotateWithPointer(
    event: FederatedPointerEvent
  ): void {
    if (
      this.parent === null
    ) {
      return;
    }

    const pointerPosition =
      event.getLocalPosition(
        this.parent
      );

    const pointerAngle =
      Math.atan2(
        pointerPosition.y -
          this.rotationPivotParentY,

        pointerPosition.x -
          this.rotationPivotParentX
      );

    const angleChange =
      pointerAngle -
      this.rotationStartPointerAngle;

    const newRotation =
      this.rotationStartRulerAngle +
      angleChange;

    this.rotation =
      newRotation;

    /*
     * Rotation changes where the ruler's
     * local origin would normally appear.
     *
     * Recalculate the ruler position so that
     * the selected opposite corner remains
     * fixed in screen space.
     */
    const cos =
      Math.cos(
        newRotation
      );

    const sin =
      Math.sin(
        newRotation
      );

    const rotatedPivotX =
      this.rotationPivotLocalX *
        cos -
      this.rotationPivotLocalY *
        sin;

    const rotatedPivotY =
      this.rotationPivotLocalX *
        sin +
      this.rotationPivotLocalY *
        cos;

    this.position.set(
      this.rotationPivotParentX -
        rotatedPivotX,

      this.rotationPivotParentY -
        rotatedPivotY
    );
  }

  // ==================================================
  // POINTER MOVE / UP
  // ==================================================

  private handlePointerMove(
    event: FederatedPointerEvent
  ): void {
    if (
      this.parent === null
    ) {
      return;
    }

    if (
      this.isDragging
    ) {
      this.moveWithPointer(
        event
      );

      return;
    }

    if (
      this.isRotating
    ) {
      this.rotateWithPointer(
        event
      );
    }
  }

  private handlePointerUp(): void {
    this.isDragging =
      false;

    this.isRotating =
      false;

    this.cursor =
      "grab";

    this.topRotationHandle.cursor =
      "grab";

    this.bottomRotationHandle.cursor =
      "grab";
  }

  // ==================================================
  // PUBLIC ORIENTATION
  // ==================================================

  public setVertical(): void {
    this.rotation = 0;
  }

  public setHorizontal(): void {
    this.rotation =
      Math.PI / 2;
  }
}