import {
  Container,
  Graphics,
} from "pixi.js";

export type DrawingPoint2D = {
  x: number;
  y: number;
};

export class DrawingSurface2D extends Container {
  private readonly graphics: Graphics;

  constructor() {
    super();

    this.graphics =
      new Graphics();

    /*
     * The drawing surface itself should not
     * intercept mouse or touch events.
     */
    this.eventMode =
      "none";

    this.graphics.eventMode =
      "none";

    this.addChild(
      this.graphics
    );
  }

  /*
   * Draw a straight line between two points.
   *
   * Rulers, pencils, compasses, etc. can all
   * call this same method.
   */
  public drawLine(
    start: DrawingPoint2D,
    end: DrawingPoint2D,
    width = 2,
    color = 0x222222
  ): void {
    this.graphics
      .moveTo(
        start.x,
        start.y
      )
      .lineTo(
        end.x,
        end.y
      )
      .stroke({
        color,
        width,
      });
  }

  /*
   * Draw a small dot.
   *
   * This may be useful later for pencils,
   * marking points, geometry constructions, etc.
   */
  public drawPoint(
    point: DrawingPoint2D,
    radius = 3,
    color = 0x222222
  ): void {
    this.graphics
      .circle(
        point.x,
        point.y,
        radius
      )
      .fill({
        color,
      });
  }

  /*
   * Remove everything drawn on this surface.
   */
  public clear(): void {
    this.graphics.clear();
  }

  /*
   * Expose the underlying Graphics only when
   * absolutely necessary.
   *
   * Eraser2D may use this initially.
   *
   * Most tools should prefer drawLine(),
   * drawPoint(), etc. instead.
   */
  public getGraphics(): Graphics {
    return this.graphics;
  }
}