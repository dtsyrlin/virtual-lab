import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";

import {
  DrawingSurface2D,
} from "./DrawingSurface2D";

export type Point2D = {
  x: number;
  y: number;
};

export type RulerOrientation =
  | "horizontal"
  | "vertical";

export class DrawingRuler2D extends Container {
  public readonly lengthMeters: number;
  public readonly pixelsPerMeter: number;

  private readonly drawingSurface: DrawingSurface2D;

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

  /*
   * Pencil state.
   */
  private pencilAttached = false;
  private pencilLocalY = 0;

  private readonly pencilGraphics: Graphics;

  /*
   * Browser context-menu suppression.
   */
  private contextMenuListener:
    | ((event: MouseEvent) => void)
    | null = null;

  private contextMenuCanvas:
    | HTMLCanvasElement
    | null = null;

  constructor(
    lengthMeters: number,
    initialPosition: Point2D,
    pixelsPerMeter: number,
    drawingSurface: DrawingSurface2D,
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

    this.drawingSurface =
      drawingSurface;

    /*
     * Ruler origin remains bottom-left.
     */
    this.position.set(
      initialPosition.x,
      initialPosition.y
    );

    this.drawRuler();

    /*
     * Rotation handles remain centered
     * on the ruler ends.
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

    /*
     * Visible pencil point.
     */
    this.pencilGraphics =
      new Graphics();

    this.pencilGraphics
      .circle(
        0,
        0,
        6
      )
      .fill({
        color: 0x111111,
      });

    this.pencilGraphics.eventMode =
      "none";

    this.pencilGraphics.visible =
      false;

    this.addChild(
      this.pencilGraphics
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

  private createRotationHandle(
    end: "top" | "bottom"
  ): Graphics {
    const handle =
      new Graphics();

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

  private enableInteraction(): void {
    this.eventMode =
      "static";

    this.cursor =
      "grab";

    this.on(
      "pointerdown",
      this.handlePointerDown,
      this
    );

    /*
     * Right-click:
     *
     * first  -> place pencil
     * second -> draw straight line
     */
    this.on(
      "rightdown",
      this.handleRightClick,
      this
    );

    /*
     * Rotation handles prevent the ruler-body
     * pointerdown from firing.
     *
     * Therefore the attached pencil survives
     * while rotating.
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

    this.on(
      "added",
      this.disableContextMenu,
      this
    );
  }

  private disableContextMenu(): void {
    const canvases =
      document.querySelectorAll(
        "canvas"
      );

    if (
      canvases.length === 0
    ) {
      return;
    }

    const canvas =
      canvases[
        canvases.length - 1
      ];

    this.contextMenuCanvas =
      canvas;

    this.contextMenuListener =
      (
        event: MouseEvent
      ) => {
        event.preventDefault();
      };

    canvas.addEventListener(
      "contextmenu",
      this.contextMenuListener
    );
  }

  private handleRightClick(
    event: FederatedPointerEvent
  ): void {
    event.preventDefault();
    event.stopPropagation();

    const localPosition =
      event.getLocalPosition(
        this
      );

    const clickedLocalY =
      Math.max(
        -this.rulerLengthPixels,
        Math.min(
          0,
          localPosition.y
        )
      );

    /*
     * First right-click:
     *
     * attach pencil.
     */
    if (
      !this.pencilAttached
    ) {
      this.attachPencil(
        clickedLocalY
      );

      return;
    }

    /*
     * Second right-click:
     *
     * draw straight line along the
     * current ruler edge.
     */
    this.drawStraightLine(
      this.pencilLocalY,
      clickedLocalY
    );

    this.removePencil();
  }

  private attachPencil(
    localY: number
  ): void {
    this.pencilLocalY =
      localY;

    /*
     * Pencil sits exactly on the
     * centimeter-tick edge.
     */
    this.pencilGraphics.position.set(
      this.rulerWidthPixels,
      this.pencilLocalY
    );

    this.pencilGraphics.visible =
      true;

    this.pencilAttached =
      true;
  }

  private removePencil(): void {
    this.pencilAttached =
      false;

    this.pencilGraphics.visible =
      false;
  }

  private drawStraightLine(
    startLocalY: number,
    endLocalY: number
  ): void {
    const start =
      this.localRulerPointToParent(
        this.rulerWidthPixels,
        startLocalY
      );

    const end =
      this.localRulerPointToParent(
        this.rulerWidthPixels,
        endLocalY
      );

    /*
     * Ruler no longer knows HOW drawings
     * are stored.
     *
     * It simply asks the shared drawing
     * surface to draw a line.
     */
    this.drawingSurface.drawLine(
      start,
      end
    );
  }

  private drawPencilMovement(
    oldPosition: Point2D,
    newPosition: Point2D
  ): void {
    /*
     * Repeated small line segments form
     * the circular arc during rotation.
     */
    this.drawingSurface.drawLine(
      oldPosition,
      newPosition
    );
  }

  private localRulerPointToParent(
    localX: number,
    localY: number
  ): Point2D {
    const cos =
      Math.cos(
        this.rotation
      );

    const sin =
      Math.sin(
        this.rotation
      );

    return {
      x:
        this.position.x +
        localX * cos -
        localY * sin,

      y:
        this.position.y +
        localX * sin +
        localY * cos,
    };
  }

  private getPencilPosition(): Point2D {
    return (
      this.localRulerPointToParent(
        this.rulerWidthPixels,
        this.pencilLocalY
      )
    );
  }

  private handlePointerDown(
    event: FederatedPointerEvent
  ): void {
    /*
     * Only ordinary left-click belongs here.
     */
    if (
      event.button !== 0
    ) {
      return;
    }

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

    /*
     * Left-clicking the ruler body
     * removes the attached pencil.
     */
    if (
      this.pencilAttached
    ) {
      this.removePencil();
    }

    this.isDragging =
      true;

    this.cursor =
      "grabbing";

    const pointerPosition =
      event.getLocalPosition(
        this.parent
      );

    this.dragOffsetX =
      pointerPosition.x -
      this.position.x;

    this.dragOffsetY =
      pointerPosition.y -
      this.position.y;
  }

  private handleRotationPointerDown(
    event: FederatedPointerEvent,
    grabbedEnd:
      | "top"
      | "bottom"
  ): void {
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
     * Grab TOP:
     *
     * pivot = bottom-right.
     *
     * Grab BOTTOM:
     *
     * pivot = top-right.
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

  private handlePointerMove(
    event: FederatedPointerEvent
  ): void {
    if (
      this.parent === null
    ) {
      return;
    }

    /*
     * Normal dragging never draws.
     *
     * Clicking the body already removed
     * the pencil.
     */
    if (
      this.isDragging
    ) {
      this.moveWithPointer(
        event
      );

      return;
    }

    /*
     * While rotating, an attached pencil
     * traces an arc.
     */
    if (
      this.isRotating
    ) {
      let oldPencilPosition:
        | Point2D
        | null = null;

      if (
        this.pencilAttached
      ) {
        oldPencilPosition =
          this.getPencilPosition();
      }

      this.rotateWithPointer(
        event
      );

      if (
        this.pencilAttached &&
        oldPencilPosition !== null
      ) {
        const newPencilPosition =
          this.getPencilPosition();

        this.drawPencilMovement(
          oldPencilPosition,
          newPencilPosition
        );
      }
    }
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
     * Keep opposite corner fixed.
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

  public setVertical(): void {
    this.rotation =
      0;
  }

  public setHorizontal(): void {
    this.rotation =
      Math.PI / 2;
  }

  public override destroy(): void {
    if (
      this.contextMenuCanvas !== null &&
      this.contextMenuListener !== null
    ) {
      this.contextMenuCanvas
        .removeEventListener(
          "contextmenu",
          this.contextMenuListener
        );
    }

    super.destroy();
  }
}