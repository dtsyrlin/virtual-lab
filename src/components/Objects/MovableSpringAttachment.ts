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


type ActiveDragButton =
  | "left"
  | "right";


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


  private activeDragButton:
    ActiveDragButton | null =
      null;


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


  private onRightDragStartCallback?:
    () => boolean | void;


  private onRightDragEndCallback?:
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


  private beginMoveDrag(
    event:
      FederatedPointerEvent,
  ) {

    if (!this.parent) {
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
  }


  private onPointerDown =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (!this.parent) {
        return;
      }


      // =================================================
      // RIGHT DRAG
      //
      // Reserved for detaching the
      // right-most attached support.
      // =================================================

      if (
        event.button === 2
      ) {

        event.preventDefault();


        const allowDrag =
          this.onRightDragStartCallback?.();


        if (
          allowDrag === false ||
          allowDrag === undefined
        ) {

          return;
        }


        this.activeDragButton =
          "right";


        this.beginMoveDrag(
          event,
        );


        return;
      }


      if (
        event.button !== 0
      ) {
        return;
      }


      this.activeDragButton =
        "left";


      //
      // Free object:
      // ordinary left-drag movement.
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

          this.activeDragButton =
            null;

          return;
        }


        this.beginMoveDrag(
          event,
        );


        return;
      }


      //
      // Attached:
      // left-drag manipulates chain.
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
      // Only LEFT drag in stretch mode
      // manipulates the physics chain.
      //

      if (
        this.activeDragButton ===
          "left" &&
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
      // Loose left-drag OR right-drag:
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


      const finishedButton =
        this.activeDragButton;


      this.dragging =
        false;


      this.activeDragButton =
        null;


      this.cursor =
        "ew-resize";


      if (
        finishedButton ===
          "right"
      ) {

        this.onRightDragEndCallback?.();


        return;
      }


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


  public setOnRightDragStart(
    callback:
      () => boolean | void,
  ) {

    this.onRightDragStartCallback =
      callback;
  }


  public setOnRightDragEnd(
    callback:
      () => void,
  ) {

    this.onRightDragEndCallback =
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
