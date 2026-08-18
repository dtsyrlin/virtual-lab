import {
  Container,
  Graphics,
  FederatedPointerEvent,
} from "pixi.js";


type Point2D = {
  x: number;
  y: number;
};


type DragMode =
  | "move"
  | "stretch";


type MovableSpringAttachmentOptions = {

  id: string;

  position: Point2D;

  supportHeight?: number;

  minX: number;
  maxX: number;
};


export class MovableSpringAttachment
  extends Container {

  public readonly id: string;


  private graphics:
    Graphics;


  private supportHeight:
    number;


  private minX:
    number;

  private maxX:
    number;


  private dragging =
    false;


  private dragMode:
    DragMode =
      "move";


  private dragOffsetX =
    0;


  //
  // Returning false prevents
  // visual dragging.
  //

  private onMoveDragStartCallback?:
    () => boolean | void;


  private onMoveDragEndCallback?:
    () => void;


  private onStretchMoveCallback?:
    (point: Point2D) => void;


  private onStretchEndCallback?:
    () => void;


  constructor(
    options:
      MovableSpringAttachmentOptions,
  ) {

    super();


    this.id =
      options.id;


    this.position.set(
      options.position.x,
      options.position.y,
    );


    this.supportHeight =
      options.supportHeight ?? 100;


    this.minX =
      options.minX;

    this.maxX =
      options.maxX;


    this.graphics =
      new Graphics();


    this.addChild(
      this.graphics,
    );


    this.draw();


    this.eventMode =
      "static";


    this.cursor =
      "ew-resize";


    this.on(
      "pointerdown",
      this.onPointerDown,
    );


    this.on(
      "globalpointermove",
      this.onPointerMove,
    );


    this.on(
      "pointerup",
      this.onPointerUp,
    );


    this.on(
      "pointerupoutside",
      this.onPointerUp,
    );
  }


  private draw() {

    this.graphics.clear();


    const thickness =
      8;


    //
    // Vertical post.
    //

    this.graphics.rect(
      -thickness / 2,
      -this.supportHeight,
      thickness,
      this.supportHeight,
    );


    this.graphics.fill(
      0x666666,
    );


    //
    // Small horizontal base.
    //

    const baseWidth =
      30;


    this.graphics.rect(
      -baseWidth / 2,
      0,
      baseWidth,
      thickness,
    );


    this.graphics.fill(
      0x888888,
    );
  }


  private onPointerDown =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (
        event.button !== 0
      ) {
        return;
      }


      if (!this.parent) {
        return;
      }


      //
      // Free / detach mode.
      //

      if (
        this.dragMode ===
        "move"
      ) {

        const allowDrag =
          this.onMoveDragStartCallback?.();


        if (
          allowDrag === false
        ) {

          return;
        }


        this.dragging =
          true;


        this.cursor =
          "grabbing";


        const parentPosition =
          this.parent.toLocal(
            event.global,
          );


        this.dragOffsetX =
          parentPosition.x -
          this.x;


        return;
      }


      //
      // Attached manipulation mode.
      //

      this.dragging =
        true;


      this.cursor =
        "grabbing";


      this.onStretchMoveCallback?.({
        x:
          event.global.x,

        y:
          event.global.y,
      });
    };


  private onPointerMove =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (
        !this.dragging
      ) {
        return;
      }


      //
      // Attached:
      // SpringPhysics determines
      // the physical geometry.
      //

      if (
        this.dragMode ===
        "stretch"
      ) {

        this.onStretchMoveCallback?.({
          x:
            event.global.x,

          y:
            event.global.y,
        });


        return;
      }


      //
      // Free:
      // ordinary horizontal movement.
      //

      if (!this.parent) {
        return;
      }


      const parentPosition =
        this.parent.toLocal(
          event.global,
        );


      const requestedX =
        parentPosition.x -
        this.dragOffsetX;


      this.x =
        Math.max(
          this.minX,

          Math.min(
            this.maxX,
            requestedX,
          ),
        );
    };


  private onPointerUp =
    () => {

      if (
        !this.dragging
      ) {
        return;
      }


      this.dragging =
        false;


      this.cursor =
        "ew-resize";


      if (
        this.dragMode ===
        "stretch"
      ) {

        this.onStretchEndCallback?.();

        return;
      }


      this.onMoveDragEndCallback?.();
    };


  public setDragMode(
    mode: DragMode,
  ) {

    this.dragMode =
      mode;
  }


  public setOnMoveDragStart(
    callback:
      () => boolean | void,
  ) {

    this.onMoveDragStartCallback =
      callback;
  }


  public setOnMoveDragEnd(
    callback:
      () => void,
  ) {

    this.onMoveDragEndCallback =
      callback;
  }


  public setOnStretchMove(
    callback:
      (point: Point2D) => void,
  ) {

    this.onStretchMoveCallback =
      callback;
  }


  public setOnStretchEnd(
    callback:
      () => void,
  ) {

    this.onStretchEndCallback =
      callback;
  }


  public getClosestSpringAttachmentPosition(
    y: number,
  ) {

    const top =
      this.y -
      this.supportHeight;


    const bottom =
      this.y;


    const attachmentY =
      Math.max(
        top,

        Math.min(
          bottom,
          y,
        ),
      );


    return {
      x:
        this.x,

      y:
        attachmentY,
    };
  }


  public getSupportX() {

    return this.x;
  }


  public getSupportTopY() {

    return (
      this.y -
      this.supportHeight
    );
  }


  public getSupportBottomY() {

    return this.y;
  }
}