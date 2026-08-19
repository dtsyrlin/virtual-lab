import {
  Container,
  Graphics,
  Text,
  FederatedPointerEvent,
} from "pixi.js";


type Point2D = {
  x: number;
  y: number;
};


type WeightDragMode =
  | "move"
  | "stretch";


type ActiveDragButton =
  | "left"
  | "right";


type Weight2DOptions = {
  id: string;

  position: Point2D;

  mass: number;

  size?: number;
};


export class Weight2D extends Container {

  public readonly id: string;

  public readonly mass: number;


  private weightSize:
    number;


  private weightGraphics:
    Graphics;

  private massLabel:
    Text;


  private dragging =
    false;


  private activeDragButton:
    ActiveDragButton | null =
      null;


  private dragMode:
    WeightDragMode =
      "move";


  private dragOffsetX = 0;
  private dragOffsetY = 0;


  //
  // Returning false means:
  // do NOT begin visual dragging.
  //

  private onMoveDragStartCallback?:
    () => boolean | void;


  private onMoveDragEndCallback?:
    () => void;


  private onStretchMoveCallback?:
    (point: Point2D) => void;


  private onStretchEndCallback?:
    () => void;


  //
  // Right-drag is reserved for
  // detaching the right-most object.
  //
  // The lab decides whether this
  // particular weight is allowed
  // to detach.
  //

  private onRightDragStartCallback?:
    () => boolean | void;


  private onRightDragEndCallback?:
    () => void;


  constructor(
    options: Weight2DOptions,
  ) {

    super();


    this.id =
      options.id;


    this.mass =
      options.mass;


    this.weightSize =
      options.size ?? 50;


    this.position.set(
      options.position.x,
      options.position.y,
    );


    this.weightGraphics =
      new Graphics();


    this.addChild(
      this.weightGraphics,
    );


    this.massLabel =
      new Text({

        text:
          `${this.mass} kg`,

        style: {
          fontSize: 14,
          fill: 0x000000,
        },
      });


    this.massLabel.anchor.set(
      0.5,
    );


    this.massLabel.position.set(
      this.weightSize / 2,
      this.weightSize / 2,
    );


    this.addChild(
      this.massLabel,
    );


    this.draw();


    this.eventMode =
      "static";


    this.cursor =
      "grab";


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

    this.weightGraphics.clear();


    this.weightGraphics.rect(
      0,
      0,
      this.weightSize,
      this.weightSize,
    );


    this.weightGraphics.fill(
      0xb0b0b0,
    );


    this.weightGraphics.stroke({
      width: 2,
      color: 0x333333,
    });
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


    this.dragOffsetY =
      parentPosition.y -
      this.y;
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
      // Right-drag never stretches.
      // It asks the lab whether this
      // weight may detach, then moves
      // it as an ordinary loose object.
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


      // =================================================
      // LEFT DRAG: MOVE MODE
      // =================================================

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


      // =================================================
      // LEFT DRAG: STRETCH MODE
      //
      // Preserve the point inside the
      // weight where the user grabbed it.
      // This prevents the weight from
      // jumping on pointer-down.
      // =================================================

      const parentPosition =
        this.parent.toLocal(
          event.global,
        );


      this.dragOffsetX =
        parentPosition.x -
        this.x;


      this.dragOffsetY =
        parentPosition.y -
        this.y;


      this.dragging =
        true;


      this.cursor =
        "grabbing";


      this.onStretchMoveCallback?.({
        x:
          event.global.x -
          this.dragOffsetX,

        y:
          event.global.y -
          this.dragOffsetY,
      });
    };


  private onPointerMove =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (!this.dragging) {
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
            event.global.x -
            this.dragOffsetX,

          y:
            event.global.y -
            this.dragOffsetY,
        });


        return;
      }


      //
      // Loose left-drag OR right-drag:
      // ordinary visual movement.
      //

      if (!this.parent) {
        return;
      }


      const parentPosition =
        this.parent.toLocal(
          event.global,
        );


      this.position.set(

        parentPosition.x -
          this.dragOffsetX,

        parentPosition.y -
          this.dragOffsetY,
      );
    };


  private onPointerUp = () => {

    if (!this.dragging) {
      return;
    }


    const finishedButton =
      this.activeDragButton;


    this.dragging =
      false;


    this.activeDragButton =
      null;


    this.cursor =
      "grab";


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
    mode: WeightDragMode,
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


  public setPosition(
    x: number,
    y: number,
  ) {

    this.position.set(
      x,
      y,
    );
  }


  public getCenterPosition() {

    return {
      x:
        this.x +
        this.weightSize / 2,

      y:
        this.y +
        this.weightSize / 2,
    };
  }


  public getTopAttachmentPosition() {

    return {
      x:
        this.x +
        this.weightSize / 2,

      y:
        this.y,
    };
  }


  public getBottomAttachmentPosition() {

    return {
      x:
        this.x +
        this.weightSize / 2,

      y:
        this.y +
        this.weightSize,
    };
  }


  public getLeftAttachmentPosition() {

    return {
      x:
        this.x,

      y:
        this.y +
        this.weightSize / 2,
    };
  }


  public getRightAttachmentPosition() {

    return {
      x:
        this.x +
        this.weightSize,

      y:
        this.y +
        this.weightSize / 2,
    };
  }


  public getWeightSize() {

    return this.weightSize;
  }
}
