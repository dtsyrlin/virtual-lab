import {
  Container,
  Graphics,
} from "pixi.js";

export class Table2D extends Container {
  public readonly xMeters: number;
  public readonly topYMeters: number;
  public readonly widthMeters: number;
  public readonly thicknessMeters: number;

  constructor(
    xMeters: number,
    topYMeters: number,
    widthMeters: number,
    thicknessMeters: number,
    pixelsPerMeter: number
  ) {
    super();

    this.xMeters = xMeters;
    this.topYMeters = topYMeters;
    this.widthMeters = widthMeters;
    this.thicknessMeters = thicknessMeters;

    const widthPixels =
      widthMeters * pixelsPerMeter;

    const thicknessPixels =
      thicknessMeters * pixelsPerMeter;

    const xPixels =
      xMeters * pixelsPerMeter;

    /*
     * For now, topYMeters is interpreted directly
     * as screen-distance in meters from the top.
     *
     * We'll improve our world-coordinate conversion
     * when we introduce the ball physics.
     */
    const topYPixels =
      topYMeters * pixelsPerMeter;

    this.position.set(
      xPixels,
      topYPixels
    );

    const body = new Graphics();

    body
      .rect(
        0,
        0,
        widthPixels,
        thicknessPixels
      )
      .fill({
        color: 0x8b5a2b,
      })
      .stroke({
        color: 0x4f3218,
        width: 2,
      });

    this.addChild(body);
  }
}