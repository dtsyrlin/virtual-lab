import {
  Container,
  FederatedPointerEvent,
  Graphics,
} from "pixi.js";

import {
  DrawingSurface2D,
} from "./DrawingSurface2D";


export interface Pencil2DOptions {
  position?: {
    x: number;
    y: number;
  };

  lineWidth?: number;
}


export class Pencil2D extends Container {

  private pencilGraphics: Graphics;

  /*
   * Shared drawing surface owned by the lab.
   *
   * Pencil2D does not own the drawing anymore.
   */
  private readonly drawingSurface: DrawingSurface2D;


  private drawing = false;
  private dragging = false;


  private dragOffsetX = 0;
  private dragOffsetY = 0;


  private previousDrawX = 0;
  private previousDrawY = 0;


  private lineWidth: number;


  /*
   * Radius around the graphite tip that counts as
   * "start drawing".
   */
  private readonly tipHitRadius = 12;


  constructor(
    drawingSurface: DrawingSurface2D,
    options: Pencil2DOptions = {}
  ) {

    super();


    this.drawingSurface =
      drawingSurface;


    this.lineWidth =
      options.lineWidth ?? 2;


    this.position.set(
      options.position?.x ?? 300,
      options.position?.y ?? 300
    );


    // --------------------------------------------------
    // Visible pencil
    // --------------------------------------------------

    this.pencilGraphics =
      new Graphics();

    this.drawPencil();

    this.addChild(
      this.pencilGraphics
    );


    // --------------------------------------------------
    // Interaction
    // --------------------------------------------------

    this.eventMode =
      "static";

    this.cursor =
      "pointer";


    this.on(
      "pointerdown",
      this.onPointerDown,
      this
    );

    this.on(
      "globalpointermove",
      this.onPointerMove,
      this
    );

    this.on(
      "pointerup",
      this.onPointerUp,
      this
    );

    this.on(
      "pointerupoutside",
      this.onPointerUp,
      this
    );

  }


  // ==================================================
  // POINTER DOWN
  // ==================================================


  private onPointerDown(
    event: FederatedPointerEvent
  ): void {

    /*
     * Convert pointer position into coordinates
     * relative to the pencil.
     */
    const local =
      this.toLocal(
        event.global
      );


    const distanceFromTip =
      Math.sqrt(
        local.x * local.x +
        local.y * local.y
      );


    // ------------------------------------------------
    // If user grabs near graphite tip -> DRAW
    // ------------------------------------------------

    if (
      distanceFromTip <=
      this.tipHitRadius
    ) {

      this.drawing =
        true;

      this.dragging =
        false;


      /*
       * Record the first drawing point.
       */
      this.previousDrawX =
        event.global.x;

      this.previousDrawY =
        event.global.y;


      /*
       * Make the pencil tip sit exactly
       * under the pointer.
       */
      this.position.set(
        event.global.x,
        event.global.y
      );


      return;
    }


    // ------------------------------------------------
    // Otherwise -> MOVE PENCIL WITHOUT DRAWING
    // ------------------------------------------------

    this.dragging =
      true;

    this.drawing =
      false;


    this.dragOffsetX =
      event.global.x -
      this.x;

    this.dragOffsetY =
      event.global.y -
      this.y;

  }


  // ==================================================
  // POINTER MOVE
  // ==================================================


  private onPointerMove(
    event: FederatedPointerEvent
  ): void {


    // ------------------------------------------------
    // DRAWING
    // ------------------------------------------------

    if (
      this.drawing
    ) {

      const x =
        event.global.x;

      const y =
        event.global.y;


      /*
       * Draw onto the SHARED drawing surface.
       *
       * Pencil2D no longer owns any permanent
       * drawing graphics.
       */
      this.drawingSurface.drawLine(
        {
          x:
            this.previousDrawX,

          y:
            this.previousDrawY,
        },

        {
          x,
          y,
        },

        this.lineWidth
      );


      /*
       * Pencil tip follows the drawing point.
       */
      this.position.set(
        x,
        y
      );


      this.previousDrawX =
        x;

      this.previousDrawY =
        y;


      return;
    }


    // ------------------------------------------------
    // DRAGGING WITHOUT DRAWING
    // ------------------------------------------------

    if (
      this.dragging
    ) {

      this.position.set(

        event.global.x -
        this.dragOffsetX,

        event.global.y -
        this.dragOffsetY

      );

    }

  }


  // ==================================================
  // POINTER UP
  // ==================================================


  private onPointerUp(): void {

    this.drawing =
      false;

    this.dragging =
      false;

  }


  // ==================================================
  // VISUAL
  // ==================================================


  private drawPencil(): void {

    this.pencilGraphics.clear();


    /*
     * Pencil tip is local coordinate:
     *
     *     0, 0
     *
     * Everything else extends upward/right.
     */


    // graphite tip

    this.pencilGraphics
      .circle(
        0,
        0,
        4
      )
      .fill(
        0x222222
      );


    // wood

    this.pencilGraphics
      .poly([
        0, 0,
        18, -7,
        12, 7,
      ])
      .fill(
        0xd6aa6d
      );


    // yellow body

    this.pencilGraphics
      .poly([
        16, -8,
        90, -35,
        98, -21,
        12, 8,
      ])
      .fill(
        0xe8b923
      );


    // outline

    this.pencilGraphics
      .poly([
        0, 0,
        16, -8,
        90, -35,
        98, -21,
        12, 8,
        0, 0,
      ])
      .stroke({
        width: 2,
        color: 0x444444,
      });


    // metal

    this.pencilGraphics
      .poly([
        90, -35,
        101, -39,
        109, -25,
        98, -21,
      ])
      .fill(
        0xaaaaaa
      );


    // eraser

    this.pencilGraphics
      .poly([
        101, -39,
        112, -43,
        120, -29,
        109, -25,
      ])
      .fill(
        0xe58f9d
      );

  }


  // ==================================================
  // CLEANUP
  // ==================================================


  public override destroy(): void {

    this.off(
      "pointerdown",
      this.onPointerDown,
      this
    );

    this.off(
      "globalpointermove",
      this.onPointerMove,
      this
    );

    this.off(
      "pointerup",
      this.onPointerUp,
      this
    );

    this.off(
      "pointerupoutside",
      this.onPointerUp,
      this
    );


    /*
     * IMPORTANT:
     *
     * Do NOT destroy drawingSurface here.
     *
     * It belongs to the lab and may be shared by
     * rulers, other pencils, erasers, etc.
     */

    super.destroy({
      children: true,
    });

  }

}