import {
  Container,
  FederatedPointerEvent,
  Graphics,
} from "pixi.js";

import {
  DrawingSurface2D,
} from "./DrawingSurface2D";

export type EraserPoint2D = {
  x: number;
  y: number;
};

export class Eraser2D extends Container {
  private readonly drawingSurface: DrawingSurface2D;

  /*
   * Must match the lab background color.
   */
  private readonly backgroundColor: number;

  private readonly eraserWidth = 40;
  private readonly eraserHeight = 24;

  /*
   * Width of the erased path.
   */
  private readonly eraseWidth = 24;

  private isDragging = false;

  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private previousEraseX = 0;
  private previousEraseY = 0;

  constructor(
    drawingSurface: DrawingSurface2D,
    initialPosition: EraserPoint2D,
    backgroundColor = 0xe8edf2
  ) {
    super();

    this.drawingSurface =
      drawingSurface;

    this.backgroundColor =
      backgroundColor;

    this.position.set(
      initialPosition.x,
      initialPosition.y
    );

    this.drawEraser();

    this.enableInteraction();
  }

  private drawEraser(): void {
    const body =
      new Graphics();

    body
      .roundRect(
        -this.eraserWidth / 2,
        -this.eraserHeight / 2,
        this.eraserWidth,
        this.eraserHeight,
        5
      )
      .fill({
        color: 0xf0a0a0,
      })
      .stroke({
        color: 0x704040,
        width: 2,
      });

    this.addChild(body);
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
      true;

    this.cursor =
      "grabbing";

    const pointerPosition =
      event.getLocalPosition(
        this.parent
      );

    /*
     * Prevent the eraser from jumping
     * when grabbed away from its center.
     */
    this.dragOffsetX =
      pointerPosition.x -
      this.position.x;

    this.dragOffsetY =
      pointerPosition.y -
      this.position.y;

    this.previousEraseX =
      this.position.x;

    this.previousEraseY =
      this.position.y;

    /*
     * Immediately erase where the
     * eraser is picked up.
     */
    this.erasePoint(
      this.position.x,
      this.position.y
    );
  }

  private handlePointerMove(
    event: FederatedPointerEvent
  ): void {
    if (
      !this.isDragging
    ) {
      return;
    }

    if (
      this.parent === null
    ) {
      return;
    }

    const pointerPosition =
      event.getLocalPosition(
        this.parent
      );

    const newX =
      pointerPosition.x -
      this.dragOffsetX;

    const newY =
      pointerPosition.y -
      this.dragOffsetY;

    /*
     * Erase continuously between the old
     * and new eraser positions.
     */
    this.eraseSegment(
      this.previousEraseX,
      this.previousEraseY,
      newX,
      newY
    );

    this.position.set(
      newX,
      newY
    );

    this.previousEraseX =
      newX;

    this.previousEraseY =
      newY;
  }

  private eraseSegment(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    /*
     * For now erasing means drawing
     * with the lab's background color.
     *
     * Importantly, Eraser2D does not know
     * whether the original mark came from
     * a ruler, pencil, compass, etc.
     */
    this.drawingSurface
      .getGraphics()
      .moveTo(
        x1,
        y1
      )
      .lineTo(
        x2,
        y2
      )
      .stroke({
        color:
          this.backgroundColor,
        width:
          this.eraseWidth,
        cap:
          "round",
      });
  }

  private erasePoint(
    x: number,
    y: number
  ): void {
    this.drawingSurface
      .getGraphics()
      .circle(
        x,
        y,
        this.eraseWidth / 2
      )
      .fill({
        color:
          this.backgroundColor,
      });
  }

  private handlePointerUp(): void {
    this.isDragging =
      false;

    this.cursor =
      "grab";
  }
}