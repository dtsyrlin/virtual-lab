import {
  Container,
  Graphics,
} from "pixi.js";


type HorizontalSpringAttachmentOptions = {

  position: {
    x: number;
    y: number;
  };

  width: number;

  supportHeight?: number;
};


export class HorizontalSpringAttachment extends Container {

  private graphics: Graphics;

  private surfaceWidth: number;
  private supportHeight: number;


  constructor(
    options: HorizontalSpringAttachmentOptions,
  ) {

    super();


    this.position.set(
      options.position.x,
      options.position.y,
    );


    this.surfaceWidth =
      options.width;

    this.supportHeight =
      options.supportHeight ?? 300;


    this.graphics =
      new Graphics();


    this.addChild(
      this.graphics,
    );


    this.draw();
  }


  private draw() {

    this.graphics.clear();


    const thickness = 8;


    //
    // Horizontal surface.
    //
    // The weight will slide along
    // the top of this surface.
    //

    this.graphics.rect(
      0,
      0,
      this.surfaceWidth,
      thickness,
    );


    //
    // Vertical wall where the
    // initial end of the spring
    // can attach.
    //

    this.graphics.rect(
      0,
      -this.supportHeight,
      thickness,
      this.supportHeight,
    );


    this.graphics.fill(
      0x666666,
    );
  }


  public getSurfaceY() {

    return this.y;
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


  public getClosestSpringAttachmentPosition(
    y: number,
  ) {

    const attachmentY =
      Math.max(

        this.getSupportTopY(),

        Math.min(
          this.getSupportBottomY(),
          y,
        ),
      );


    return {

      x:
        this.getSupportX(),

      y:
        attachmentY,
    };
  }
}