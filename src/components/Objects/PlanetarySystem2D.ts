import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
} from "pixi.js";

import {
  ValueControl,
} from "./ValueControl";


type Point = {
  x: number;
  y: number;
};


type PlanetarySystemOptions = {
  center: Point;
  orbitRadiusPixels: number;
};


export class PlanetarySystem2D extends Container {
  private readonly center: Point;
  private readonly orbitRadiusPixels: number;

  private readonly orbitGraphics = new Graphics();
  private readonly star = new Graphics();
  private readonly starRays = new Graphics();
  private readonly planet = new Container();
  private readonly planetBody = new Graphics();
  private readonly planetTerrain = new Graphics();
  private readonly person = new Container();
  private readonly personGraphics = new Graphics();
  private readonly starPlanetLine = new Graphics();
  private readonly rotationReference = new Graphics();
  private readonly observerView = new Container();
  private readonly observerPlanet = new Graphics();
  private readonly observerPerson = new Graphics();
  private readonly observerSun = new Graphics();

  private readonly playButtonText: Text;

  private eccentricity = 0;
  private rotationRatio = 1;
  private speedMultiplier = 1;

  /*
   * IMPORTANT:
   *
   * meanAnomaly is intentionally NOT wrapped into 0..2pi.
   * It is our continuous time-like orbital coordinate.
   *
   * With normalized mean motion n = 1 rad/s:
   *
   *     M = n t = t
   *
   * Axial rotation is therefore
   *
   *     theta = theta0 + rotationRatio * M
   *
   * so axial angular velocity is constant even when the
   * instantaneous orbital angular velocity varies on an ellipse.
   */
  private meanAnomaly = 0;

  private personLongitude = 0;

  private playing = false;
  private draggingPlanet = false;
  private draggingPerson = false;

  private lastDragWrappedMeanAnomaly: number | null = null;

  private readonly planetRadius = 28;


  constructor({
    center,
    orbitRadiusPixels,
  }: PlanetarySystemOptions) {
    super();

    this.center = center;
    this.orbitRadiusPixels = orbitRadiusPixels;

    this.createOrbit();
    this.createStar();
    this.createPlanet();

    this.addChild(this.starPlanetLine);
    this.addChild(this.orbitGraphics);
    this.addChild(this.starRays);
    this.addChild(this.star);
    this.addChild(this.planet);
    this.addChild(this.rotationReference);

    this.createObserverView();
    this.addChild(this.observerView);

    this.createDiscreteRotationControl();

    const eccentricityControl = new ValueControl({
      label: "Orbit eccentricity",
      min: 0,
      max: 0.7,
      step: 0.1,
      stepWidth: 28,
      value: 0,
      showRandom: false,
      showUnlimitedSupply: false,
      position: {
        x: 25,
        y: 90,
      },
      formatValue: value => value.toFixed(1),
      onValueChanged: value => {
        this.eccentricity = value;
        this.createOrbit();
        this.createStar();
        this.updatePlanet();
      },
    });

    this.addChild(eccentricityControl);

    const speedControl = new ValueControl({
      label: "Simulation speed",
      min: 0.5,
      max: 3,
      step: 0.5,
      stepWidth: 42,
      value: 1,
      showRandom: false,
      showUnlimitedSupply: false,
      position: {
        x: 25,
        y: 155,
      },
      formatValue: value => `${value.toFixed(1)}×`,
      onValueChanged: value => {
        this.speedMultiplier = value;
      },
    });

    this.addChild(speedControl);

    this.playButtonText = this.createButton(
      25,
      225,
      92,
      36,
      "Play",
      () => {
        this.playing = !this.playing;
        this.playButtonText.text =
          this.playing
            ? "Pause"
            : "Play";
      }
    );

    this.updatePlanet();
  }


  public update(
    deltaTimeSeconds: number
  ): void {
    if (!this.playing) {
      return;
    }

    this.meanAnomaly +=
      deltaTimeSeconds *
      this.speedMultiplier;

    this.updatePlanet();
  }


  private get effectiveCenter(): Point {
    /*
     * As eccentricity increases, shift the whole star/orbit system
     * to the right so the elongated left side remains comfortably
     * on screen.
     */
    return {
      x:
        this.center.x +
        45 +
        150 *
        this.eccentricity,
      y:
        this.center.y,
    };
  }


  private createOrbit(): void {
    this.orbitGraphics.clear();

    const e =
      this.eccentricity;

    const a =
      this.orbitRadiusPixels;

    const b =
      a *
      Math.sqrt(
        1 - e * e
      );

    /*
     * Star is at the right-hand focus.
     * Perihelion is therefore to the right of the star.
     */
    const focus =
      this.effectiveCenter;

    const ellipseCenterX =
      focus.x -
      a * e;

    this.orbitGraphics
      .ellipse(
        ellipseCenterX,
        focus.y,
        a,
        b
      )
      .stroke({
        width: 2,
        color: 0x777777,
      });
  }


  private createStar(): void {
    this.starRays.clear();
    this.star.clear();

    const focus =
      this.effectiveCenter;

    for (
      let i = 0;
      i < 16;
      i++
    ) {
      const angle =
        i *
        Math.PI /
        8;

      const inner = 34;

      const outer =
        i % 2 === 0
          ? 49
          : 43;

      this.starRays
        .moveTo(
          focus.x +
            inner *
            Math.cos(angle),

          focus.y +
            inner *
            Math.sin(angle)
        )
        .lineTo(
          focus.x +
            outer *
            Math.cos(angle),

          focus.y +
            outer *
            Math.sin(angle)
        );
    }

    this.starRays.stroke({
      width: 3,
      color: 0xe5a000,
    });

    this.star
      .circle(
        focus.x,
        focus.y,
        31
      )
      .fill(
        0xffd54a
      )
      .stroke({
        width: 2,
        color: 0xc88a00,
      });
  }


  private createPlanet(): void {
    this.planetBody
      .circle(
        0,
        0,
        this.planetRadius
      )
      .fill(
        0x6ea8dc
      )
      .stroke({
        width: 2,
        color: 0x2e5f8a,
      });

    /*
     * Simple surface/landscape features fixed to the planet.
     * These rotate with the planet, making axial rotation visually obvious.
     */
    this.planetTerrain
      .circle(
        -10,
        -8,
        5
      )
      .fill(
        0x4f86b5
      )

      .circle(
        9,
        11,
        4
      )
      .fill(
        0x4f86b5
      )

      .circle(
        13,
        -12,
        3
      )
      .fill(
        0x4f86b5
      )

      /*
       * Two small mountain-like silhouettes near the rim.
       */
      .moveTo(
        -23,
        8
      )
      .lineTo(
        -17,
        1
      )
      .lineTo(
        -11,
        8
      )
      .closePath()
      .fill(
        0x3f759f
      )

      .moveTo(
        5,
        -23
      )
      .lineTo(
        11,
        -17
      )
      .lineTo(
        16,
        -22
      )
      .closePath()
      .fill(
        0x3f759f
      );

    this.planet.addChild(
      this.planetBody
    );

    this.planet.addChild(
      this.planetTerrain
    );

    this.createPerson();

    this.planet.addChild(
      this.person
    );

    /*
     * Planet dragging is attached to the body rather than the whole
     * planet container. That lets the person intercept its own drag.
     */
    this.planetBody.eventMode =
      "static";

    this.planetBody.cursor =
      "grab";

    this.planetBody.on(
      "pointerdown",
      this.onPlanetPointerDown
    );

    this.planetBody.on(
      "globalpointermove",
      this.onPlanetPointerMove
    );

    this.planetBody.on(
      "pointerup",
      this.onPlanetPointerUp
    );

    this.planetBody.on(
      "pointerupoutside",
      this.onPlanetPointerUp
    );
  }


  private createPerson(): void {
    /*
     * Tiny observer standing on the planet.
     * Local +x points outward from the surface.
     *
     * Feet are near x = planetRadius; head is farther outward.
     */
    this.personGraphics
      .circle(
        this.planetRadius + 13,
        0,
        4
      )
      .fill(
        0xc62828
      )
      .stroke({
        width: 1,
        color: 0x7f1717,
      })

      .moveTo(
        this.planetRadius + 9,
        0
      )
      .lineTo(
        this.planetRadius + 2,
        0
      )

      .moveTo(
        this.planetRadius + 7,
        0
      )
      .lineTo(
        this.planetRadius + 4,
        -5
      )

      .moveTo(
        this.planetRadius + 7,
        0
      )
      .lineTo(
        this.planetRadius + 4,
        5
      )

      .moveTo(
        this.planetRadius + 2,
        0
      )
      .lineTo(
        this.planetRadius - 2,
        -4
      )

      .moveTo(
        this.planetRadius + 2,
        0
      )
      .lineTo(
        this.planetRadius - 2,
        4
      )

      .stroke({
        width: 3,
        color: 0xc62828,
      });

    /*
     * Invisible generous hit target so the tiny person is easy to grab.
     */
    const hitTarget =
      new Graphics()
        .circle(
          this.planetRadius + 7,
          0,
          13
        )
        .fill({
          color: 0xffffff,
          alpha: 0.001,
        });

    this.person.addChild(
      hitTarget
    );

    this.person.addChild(
      this.personGraphics
    );

    this.person.eventMode =
      "static";

    this.person.cursor =
      "grab";

    this.person.on(
      "pointerdown",
      this.onPersonPointerDown
    );

    this.person.on(
      "globalpointermove",
      this.onPersonPointerMove
    );

    this.person.on(
      "pointerup",
      this.onPersonPointerUp
    );

    this.person.on(
      "pointerupoutside",
      this.onPersonPointerUp
    );
  }


  private onPlanetPointerDown = (
    event: FederatedPointerEvent
  ) => {
    if (
      this.draggingPerson
    ) {
      return;
    }

    event.stopPropagation();

    this.draggingPlanet = true;
    this.playing = false;

    this.playButtonText.text =
      "Play";

    this.planetBody.cursor =
      "grabbing";

    /*
     * Seed the unwrap logic from the current continuous M.
     */
    this.lastDragWrappedMeanAnomaly =
      this.wrapZeroToTwoPi(
        this.meanAnomaly
      );
  };


  private onPlanetPointerMove = (
    event: FederatedPointerEvent
  ) => {
    if (
      !this.draggingPlanet
    ) {
      return;
    }

    const local =
      event.getLocalPosition(
        this
      );

    this.setOrbitPositionFromPointer(
      local.x,
      local.y
    );
  };


  private onPlanetPointerUp = () => {
    this.draggingPlanet = false;

    this.planetBody.cursor =
      "grab";

    this.lastDragWrappedMeanAnomaly =
      null;
  };


  private onPersonPointerDown = (
    event: FederatedPointerEvent
  ) => {
    event.stopPropagation();

    this.draggingPerson = true;
    this.draggingPlanet = false;

    this.playing = false;

    this.playButtonText.text =
      "Play";

    this.person.cursor =
      "grabbing";
  };


  private onPersonPointerMove = (
    event: FederatedPointerEvent
  ) => {
    if (
      !this.draggingPerson
    ) {
      return;
    }

    /*
     * Get pointer coordinates in the planet's rotating local frame.
     * The angle is therefore the observer's longitude ON THE PLANET,
     * not an absolute screen angle.
     */
    const local =
      event.getLocalPosition(
        this.planet
      );

    this.personLongitude =
      Math.atan2(
        local.y,
        local.x
      );

    this.person.rotation =
      this.personLongitude;

    /*
     * Refresh immediately while the observer is being dragged so the
     * inset Sun follows the person's changing longitude in real time.
     */
    this.updatePlanet();
  };


  private onPersonPointerUp = () => {
    this.draggingPerson = false;

    this.person.cursor =
      "grab";
  };


  private setOrbitPositionFromPointer(
    pointerX: number,
    pointerY: number
  ): void {
    const e =
      this.eccentricity;

    const a =
      this.orbitRadiusPixels;

    const b =
      a *
      Math.sqrt(
        1 - e * e
      );

    const focus =
      this.effectiveCenter;

    const ellipseCenterX =
      focus.x -
      a * e;

    /*
     * The pointer chooses eccentric anomaly E geometrically.
     * We then use Kepler's equation M = E - e sin(E).
     *
     * Crucially, M is unwrapped continuously below. That prevents the
     * old 0/2pi branch jump and makes axial orientation continuous.
     */
    const normalizedX =
      (
        pointerX -
        ellipseCenterX
      ) /
      a;

    const normalizedY =
      -(
        pointerY -
        focus.y
      ) /
      b;

    const E =
      Math.atan2(
        normalizedY,
        normalizedX
      );

    const wrappedE =
      this.wrapZeroToTwoPi(
        E
      );

    const wrappedM =
      this.wrapZeroToTwoPi(
        wrappedE -
        e *
        Math.sin(
          wrappedE
        )
      );

    if (
      this.lastDragWrappedMeanAnomaly ===
      null
    ) {
      this.lastDragWrappedMeanAnomaly =
        wrappedM;
    }

    let delta =
      wrappedM -
      this.lastDragWrappedMeanAnomaly;

    if (
      delta >
      Math.PI
    ) {
      delta -=
        2 *
        Math.PI;
    } else if (
      delta <
      -Math.PI
    ) {
      delta +=
        2 *
        Math.PI;
    }

    this.meanAnomaly +=
      delta;

    this.lastDragWrappedMeanAnomaly =
      wrappedM;

    this.updatePlanet();
  }


  private updatePlanet(): void {
    const e =
      this.eccentricity;

    const focus =
      this.effectiveCenter;

    /*
     * Kepler solver only needs the wrapped value. The continuous
     * meanAnomaly remains untouched for axial rotation.
     */
    const wrappedM =
      this.wrapZeroToTwoPi(
        this.meanAnomaly
      );

    const E =
      this.solveEccentricAnomaly(
        wrappedM,
        e
      );

    const x =
      Math.cos(E) -
      e;

    const y =
      Math.sqrt(
        1 - e * e
      ) *
      Math.sin(E);

    const planetX =
      focus.x +
      this.orbitRadiusPixels *
      x;

    const planetY =
      focus.y -
      this.orbitRadiusPixels *
      y;

    this.planet.position.set(
      planetX,
      planetY
    );

    /*
     * Inertial reference diameter. It starts aligned with the person's
     * initial longitude, but unlike the planet/person it does not rotate.
     * This makes the planet's accumulated axial rotation easy to see.
     */
    this.drawDashedReferenceLine(
      planetX,
      planetY
    );

    /*
     * Constant axial angular velocity:
     *
     * rotationRatio is omega_spin / n_mean.
     * Since M = n_mean t, spin angle is simply ratio * M.
     *
     * At M = 0, local +x points toward the star.
     * The +pi establishes that initial orientation.
     *
     * Pixi screen rotation is clockwise-positive, hence the minus sign.
     */
    const spinAngle =
      Math.PI +
      this.rotationRatio *
      this.meanAnomaly;

    this.planet.rotation =
      -spinAngle;

    /*
     * The observer's longitude is independent of the planet's spin.
     * Once positioned, the person remains glued to that longitude.
     */
    this.person.rotation =
      this.personLongitude;

    this.starPlanetLine.clear();

    this.starPlanetLine
      .moveTo(
        focus.x,
        focus.y
      )
      .lineTo(
        planetX,
        planetY
      )
      .stroke({
        width: 1,
        color: 0xbbbbbb,
      });

    this.updateObserverView(
      planetX,
      planetY,
      spinAngle
    );
  }


  private drawDashedReferenceLine(
    planetX: number,
    planetY: number
  ): void {
    this.rotationReference.clear();

    const halfLength =
      this.planetRadius + 9;

    const dashLength = 5;
    const gapLength = 4;

    let x =
      -halfLength;

    while (
      x <
      halfLength
    ) {
      const x2 =
        Math.min(
          x + dashLength,
          halfLength
        );

      this.rotationReference
        .moveTo(
          planetX + x,
          planetY
        )
        .lineTo(
          planetX + x2,
          planetY
        );

      x +=
        dashLength +
        gapLength;
    }

    this.rotationReference.stroke({
      width: 1,
      color: 0x555555,
    });
  }


  private createObserverView(): void {
    /*
     * Bottom-center inset: the observer and planet stay stationary.
     * The small Sun moves around them exactly as the real Sun's
     * direction changes in the person's rotating reference frame.
     */
    this.observerView.position.set(
      365,
      395
    );

    const title =
      new Text({
        text:
          "Person's perspective",

        style: {
          fontFamily:
            "Segoe UI",

          fontSize:
            14,

          fontWeight:
            "600",

          fill:
            0x222222,
        },
      });

    title.anchor.set(
      0.5,
      0
    );

    title.position.set(
      0,
      -105
    );

    this.observerView.addChild(
      title
    );

    this.observerPlanet
      .circle(
        0,
        0,
        25
      )
      .fill(
        0x6ea8dc
      )
      .stroke({
        width: 2,
        color: 0x2e5f8a,
      });

    this.observerView.addChild(
      this.observerPlanet
    );

    /*
     * Stationary person standing upright on top of the inset planet.
     */
    this.observerPerson
      .circle(
        0,
        -38,
        3.5
      )
      .fill(
        0xc62828
      )

      .moveTo(
        0,
        -34
      )
      .lineTo(
        0,
        -28
      )

      .moveTo(
        0,
        -32
      )
      .lineTo(
        -4,
        -29
      )

      .moveTo(
        0,
        -32
      )
      .lineTo(
        4,
        -29
      )

      .moveTo(
        0,
        -28
      )
      .lineTo(
        -4,
        -24
      )

      .moveTo(
        0,
        -28
      )
      .lineTo(
        4,
        -24
      )

      .stroke({
        width: 2.5,
        color: 0xc62828,
      });

    this.observerView.addChild(
      this.observerPerson
    );

    this.observerSun
      .circle(
        0,
        0,
        11
      )
      .fill(
        0xffd54a
      )
      .stroke({
        width: 1.5,
        color: 0xc88a00,
      });

    this.observerView.addChild(
      this.observerSun
    );
  }


  private updateObserverView(
    planetX: number,
    planetY: number,
    spinAngle: number
  ): void {
    const focus =
      this.effectiveCenter;

    /*
     * Physical direction from planet to star in screen-independent
     * Cartesian coordinates: +x right, +y up.
     */
    const starDirection =
      Math.atan2(
        -(focus.y - planetY),
        focus.x - planetX
      );

    /*
     * Person's absolute longitude is planet spin plus the longitude
     * selected by dragging the person around the main planet.
     */
    /*
     * personLongitude comes from Pixi local coordinates, where positive
     * angles run clockwise because screen y increases downward.
     * spinAngle/starDirection use physical Cartesian coordinates, where
     * positive angles run counterclockwise. Convert the dragged person's
     * longitude before combining the two coordinate systems.
     */
    const personDirection =
      spinAngle -
      this.personLongitude;

    const relativeSunAngle =
      starDirection -
      personDirection;

    const viewRadius =
      72;

    /*
     * The inset person stands at the top of the planet. Rotate the
     * person's local horizon frame by 90 degrees so relativeSunAngle = 0
     * places the Sun directly overhead.
     */
    this.observerSun.position.set(
      viewRadius *
        Math.sin(
          relativeSunAngle
        ),

      -viewRadius *
        Math.cos(
          relativeSunAngle
        )
    );
  }


  private solveEccentricAnomaly(
    meanAnomaly: number,
    eccentricity: number
  ): number {
    let E =
      meanAnomaly;

    for (
      let i = 0;
      i < 10;
      i++
    ) {
      const f =
        E -
        eccentricity *
        Math.sin(E) -
        meanAnomaly;

      const derivative =
        1 -
        eccentricity *
        Math.cos(E);

      E -=
        f /
        derivative;
    }

    return E;
  }


  private wrapZeroToTwoPi(
    angle: number
  ): number {
    const twoPi =
      2 *
      Math.PI;

    return (
      (
        angle %
        twoPi
      ) +
      twoPi
    ) %
    twoPi;
  }


  private createDiscreteRotationControl(): void {
    const label =
      new Text({
        text:
          "Axial rotation / mean orbital motion",

        style: {
          fontFamily:
            "Segoe UI",

          fontSize:
            14,

          fontWeight:
            "600",

          fill:
            0x000000,
        },
      });

    label.position.set(
      25,
      15
    );

    this.addChild(
      label
    );

    const values = [
      -10,
      -2,
      -1,
      -0.5,
      0,
      0.5,
      1,
      2,
      10,
    ];

    values.forEach(
      (
        value,
        index
      ) => {
        const button =
          new Container();

        button.position.set(
          25 +
            index *
            47,
          40
        );

        const background =
          new Graphics()
            .roundRect(
              0,
              0,
              42,
              30,
              3
            )
            .fill(
              value ===
                this.rotationRatio
                ? 0xdddddd
                : 0xf5f5f5
            )
            .stroke({
              width: 1,
              color: 0x888888,
            });

        const text =
          new Text({
            text:
              `${value}×`,

            style: {
              fontFamily:
                "Segoe UI",

              fontSize:
                12,

              fill:
                0x222222,
            },
          });

        text.anchor.set(
          0.5
        );

        text.position.set(
          21,
          15
        );

        button.addChild(
          background
        );

        button.addChild(
          text
        );

        button.eventMode =
          "static";

        button.cursor =
          "pointer";

        button.on(
          "pointertap",
          () => {
            this.rotationRatio =
              value;

            this.updatePlanet();

            /*
             * Redraw all choice backgrounds so the selected value
             * remains visually obvious.
             */
            this.refreshRotationChoiceButtons();
          }
        );

        button.label =
          String(value);

        this.addChild(
          button
        );
      }
    );
  }


  private refreshRotationChoiceButtons(): void {
    for (
      const child of
      this.children
    ) {
      if (
        !(child instanceof Container) ||
        child.label === null ||
        child.label === undefined
      ) {
        continue;
      }

      const value =
        Number(
          child.label
        );

      if (
        ![
          -10,
          -2,
          -1,
          -0.5,
          0,
          0.5,
          1,
          2,
          10,
        ].includes(
          value
        )
      ) {
        continue;
      }

      const background =
        child.children[0];

      if (
        background instanceof Graphics
      ) {
        background.clear();

        background
          .roundRect(
            0,
            0,
            42,
            30,
            3
          )
          .fill(
            value ===
              this.rotationRatio
              ? 0xdddddd
              : 0xf5f5f5
          )
          .stroke({
            width: 1,
            color: 0x888888,
          });
      }
    }
  }


  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void
  ): Text {
    const button =
      new Container();

    button.position.set(
      x,
      y
    );

    const background =
      new Graphics()
        .roundRect(
          0,
          0,
          width,
          height,
          4
        )
        .fill(
          0xf5f5f5
        )
        .stroke({
          width: 1,
          color: 0x999999,
        });

    const text =
      new Text({
        text: label,

        style: {
          fontFamily:
            "Segoe UI",

          fontSize:
            14,

          fill:
            0x222222,
        },
      });

    text.anchor.set(
      0.5
    );

    text.position.set(
      width / 2,
      height / 2
    );

    button.addChild(
      background
    );

    button.addChild(
      text
    );

    button.eventMode =
      "static";

    button.cursor =
      "pointer";

    button.on(
      "pointertap",
      onClick
    );

    this.addChild(
      button
    );

    return text;
  }
}
