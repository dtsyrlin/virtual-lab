import {
  Application,
} from "@pixi/react";

import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
} from "pixi.js";

import {
  Experiment2D,
  useExperiment2D,
} from "./Experiment2D";

import {
  ValueControl,
} from "../Objects/ValueControl";

import {
  Ruler2D,
} from "../Objects/Ruler2D";

import {
  Protractor2D,
} from "../Objects/Protractor2D";


type VectorKind =
  "vector" |
  "x" |
  "y";


type LabVector = {
  id: number;
  visual: VectorArrow2D;
};


const PIXELS_PER_CENTIMETER = 22;
const PIXELS_PER_METER = PIXELS_PER_CENTIMETER * 100;
const SNAP_DISTANCE = 22;
const CONNECTION_TOLERANCE = 2;

const FACTORY_ORIGIN = {
  x: 305,
  y: 395,
};

const FACTORY_Y_AXIS_TOP = 205;
const FACTORY_Y_AXIS_BOTTOM =
  2 * FACTORY_ORIGIN.y -
  FACTORY_Y_AXIS_TOP;

const WORKSPACE_LEFT = 620;
const WORKSPACE_TOP = 95;
const WORKSPACE_MARGIN = 30;

const VECTOR_COLOR = 0x2563eb;
const X_COLOR = 0xea580c;
const Y_COLOR = 0x16a34a;
const RESULT_COLOR = 0x7c3aed;


function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {

  return Math.hypot(
    x2 - x1,
    y2 - y1,
  );
}


function samePoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {

  return distance(
    x1,
    y1,
    x2,
    y2,
  ) <= CONNECTION_TOLERANCE;
}


function drawDashedLine(
  graphics: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLength = 10,
  gapLength = 6,
) {

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length <= 0.0001) {
    return;
  }

  const ux = dx / length;
  const uy = dy / length;

  let travelled = 0;

  while (travelled < length) {

    const start = travelled;
    const end = Math.min(
      travelled + dashLength,
      length,
    );

    graphics
      .moveTo(
        x1 + ux * start,
        y1 + uy * start,
      )
      .lineTo(
        x1 + ux * end,
        y1 + uy * end,
      );

    travelled +=
      dashLength + gapLength;
  }
}


class VectorArrow2D extends Container {

  public readonly kind:
    VectorKind | "result";

  public readonly dx: number;
  public readonly dy: number;

  private readonly arrow =
    new Graphics();

  private readonly tailHandle =
    new Graphics();

  private dragging = false;

  private dragOffset = {
    x: 0,
    y: 0,
  };

  public onDropped?:
    () => void;


  constructor({
    kind,
    position,
    dx,
    dy,
    draggable = true,
  }: {
    kind:
      VectorKind | "result";

    position: {
      x: number;
      y: number;
    };

    dx: number;
    dy: number;
    draggable?: boolean;
  }) {

    super();

    this.kind = kind;
    this.dx = dx;
    this.dy = dy;

    this.position.set(
      position.x,
      position.y,
    );

    this.addChild(
      this.arrow,
    );

    this.addChild(
      this.tailHandle,
    );

    this.redraw();

    if (
      kind !== "result" &&
      draggable
    ) {
      this.enableDragging();
    }
  }


  public get headX(): number {
    return this.x + this.dx;
  }


  public get headY(): number {
    return this.y + this.dy;
  }


  public beginDragging(
    event:
      FederatedPointerEvent,
  ) {

    this.dragging = true;

    this.dragOffset = {
      x:
        event.global.x -
        this.x,

      y:
        event.global.y -
        this.y,
    };
  }


  private enableDragging() {

    this.eventMode =
      "static";

    this.cursor =
      "grab";

    this.on(
      "pointerdown",
      event => {

        this.beginDragging(
          event,
        );
      },
    );

    this.on(
      "globalpointermove",
      event => {

        if (!this.dragging) {
          return;
        }

        this.position.set(
          event.global.x -
            this.dragOffset.x,

          event.global.y -
            this.dragOffset.y,
        );
      },
    );

    const stopDragging =
      () => {

        if (!this.dragging) {
          return;
        }

        this.dragging = false;

        this.onDropped?.();
      };

    this.on(
      "pointerup",
      stopDragging,
    );

    this.on(
      "pointerupoutside",
      stopDragging,
    );
  }


  private redraw() {

    this.arrow.clear();
    this.tailHandle.clear();

    // A zero-magnitude component has no visible vector and no drag target.
    if (Math.hypot(this.dx, this.dy) < 0.5) {
      return;
    }

    let color =
      VECTOR_COLOR;

    let width = 5;
    let dashed = false;

    if (this.kind === "x") {
      color = X_COLOR;
      width = 4;
      dashed = true;
    }

    if (this.kind === "y") {
      color = Y_COLOR;
      width = 4;
      dashed = true;
    }

    if (this.kind === "result") {
      color = RESULT_COLOR;
      width = 7;
    }

    if (dashed) {

      drawDashedLine(
        this.arrow,
        0,
        0,
        this.dx,
        this.dy,
      );

      this.arrow.stroke({
        width,
        color,
      });

    } else {

      this.arrow
        .moveTo(0, 0)
        .lineTo(
          this.dx,
          this.dy,
        )
        .stroke({
          width,
          color,
        });
    }

    const angle =
      Math.atan2(
        this.dy,
        this.dx,
      );

    const headLength =
      this.kind === "result"
        ? 18
        : 15;

    const headSpread =
      Math.PI / 7;

    this.arrow
      .moveTo(
        this.dx,
        this.dy,
      )
      .lineTo(
        this.dx -
          headLength *
          Math.cos(
            angle -
              headSpread,
          ),

        this.dy -
          headLength *
          Math.sin(
            angle -
              headSpread,
          ),
      )
      .moveTo(
        this.dx,
        this.dy,
      )
      .lineTo(
        this.dx -
          headLength *
          Math.cos(
            angle +
              headSpread,
          ),

        this.dy -
          headLength *
          Math.sin(
            angle +
              headSpread,
          ),
      )
      .stroke({
        width,
        color,
      });

    if (this.kind !== "result") {

      this.tailHandle
        .circle(
          0,
          0,
          6,
        )
        .fill(
          0xffffff,
        )
        .stroke({
          width: 2,
          color,
        });
    }
  }
}


function makeButton({
  text,
  x,
  y,
  width,
  onClick,
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  onClick: () => void;
}) {

  const button =
    new Container();

  button.position.set(
    x,
    y,
  );

  const background =
    new Graphics();

  background
    .roundRect(
      0,
      0,
      width,
      40,
      7,
    )
    .fill(
      0xf8fafc,
    )
    .stroke({
      width: 2,
      color: 0x64748b,
    });

  button.addChild(
    background,
  );

  const label =
    new Text({
      text,
      style: {
        fontSize: 18,
        fill: 0x1f2937,
        fontWeight: "bold",
      },
    });

  label.anchor.set(
    0.5,
  );

  label.position.set(
    width / 2,
    20,
  );

  button.addChild(
    label,
  );

  button.eventMode =
    "static";

  button.cursor =
    "pointer";

  button.on(
    "pointerdown",
    onClick,
  );

  return button;
}


function VectorAdditionContents() {

  useExperiment2D(
    (
      experiment:
        Experiment2D,
    ) => {

      let selectedMagnitude = 5;
      let selectedAnglePi = 1 / 6;

      let nextVectorId = 1;

      const vectors:
        LabVector[] = [];

      const resultants:
        VectorArrow2D[] = [];


      const workspaceWidth =
        Math.max(
          380,
          window.innerWidth -
            WORKSPACE_LEFT -
            WORKSPACE_MARGIN,
        );

      const workspaceHeight =
        Math.max(
          330,
          window.innerHeight -
            WORKSPACE_TOP -
            WORKSPACE_MARGIN,
        );


      /*
       * Workspace grid.
       */
      const workspace =
        new Graphics();

      workspace
        .roundRect(
          WORKSPACE_LEFT,
          WORKSPACE_TOP,
          workspaceWidth,
          workspaceHeight,
          10,
        )
        .fill(
          0xf8fafc,
        )
        .stroke({
          width: 2,
          color: 0x94a3b8,
        });

      const grid =
        new Graphics();

      const gridStep =
        PIXELS_PER_CENTIMETER;

      for (
        let x =
          WORKSPACE_LEFT +
          gridStep;

        x <
          WORKSPACE_LEFT +
          workspaceWidth;

        x += gridStep
      ) {

        grid
          .moveTo(
            x,
            WORKSPACE_TOP,
          )
          .lineTo(
            x,
            WORKSPACE_TOP +
              workspaceHeight,
          );
      }

      for (
        let y =
          WORKSPACE_TOP +
          gridStep;

        y <
          WORKSPACE_TOP +
          workspaceHeight;

        y += gridStep
      ) {

        grid
          .moveTo(
            WORKSPACE_LEFT,
            y,
          )
          .lineTo(
            WORKSPACE_LEFT +
              workspaceWidth,
            y,
          );
      }

      grid.stroke({
        width: 1,
        color: 0xdbe3ec,
      });

      experiment.add(
        workspace,
      );

      experiment.add(
        grid,
      );

      const workspaceTitle =
        new Text({
          text:
            "Vector Addition Workspace",
          style: {
            fontSize: 20,
            fill: 0x334155,
            fontWeight: "bold",
          },
        });

      workspaceTitle.position.set(
        WORKSPACE_LEFT + 14,
        WORKSPACE_TOP + 10,
      );

      experiment.add(
        workspaceTitle,
      );



      const factoryAxes =
        new Graphics();

      factoryAxes
        .moveTo(
          55,
          FACTORY_ORIGIN.y,
        )
        .lineTo(
          555,
          FACTORY_ORIGIN.y,
        )
        .moveTo(
          FACTORY_ORIGIN.x,
          FACTORY_Y_AXIS_TOP,
        )
        .lineTo(
          FACTORY_ORIGIN.x,
          FACTORY_Y_AXIS_BOTTOM,
        )
        .stroke({
          width: 1.5,
          color: 0x94a3b8,
        });

      experiment.add(
        factoryAxes,
      );


      let factoryVector:
        VectorArrow2D;

      let factoryX:
        VectorArrow2D;

      let factoryY:
        VectorArrow2D;


      const calculateVector =
        () => {

          const radians =
            selectedAnglePi *
            Math.PI;

          return {
            dx:
              selectedMagnitude *
              Math.cos(radians) *
              PIXELS_PER_CENTIMETER,

            dy:
              -selectedMagnitude *
              Math.sin(radians) *
              PIXELS_PER_CENTIMETER,
          };
        };


      const clearResultants =
        () => {

          for (
            const resultant
            of resultants
          ) {

            experiment.remove(
              resultant,
            );

            resultant.destroy({
              children: true,
            });
          }

          resultants.length = 0;
        };


      const snapVector =
        (
          vector:
            VectorArrow2D,
        ) => {

          let best:
            {
              x: number;
              y: number;
              distance: number;
            } |
            null = null;

          for (
            const candidate
            of vectors
          ) {

            if (
              candidate.visual ===
              vector
            ) {
              continue;
            }

            /*
             * Case 1: dragged tail is near another vector's head.
             */
            const tailToHead =
              distance(
                vector.x,
                vector.y,
                candidate.visual.headX,
                candidate.visual.headY,
              );

            if (
              tailToHead <=
                SNAP_DISTANCE &&
              (
                best === null ||
                tailToHead <
                  best.distance
              )
            ) {

              best = {
                x:
                  candidate.visual.headX,
                y:
                  candidate.visual.headY,
                distance:
                  tailToHead,
              };
            }

            /*
             * Case 2: dragged head is near another vector's tail.
             * Move the whole dragged vector so its head lands there.
             */
            const headToTail =
              distance(
                vector.headX,
                vector.headY,
                candidate.visual.x,
                candidate.visual.y,
              );

            if (
              headToTail <=
                SNAP_DISTANCE &&
              (
                best === null ||
                headToTail <
                  best.distance
              )
            ) {

              best = {
                x:
                  candidate.visual.x -
                  vector.dx,
                y:
                  candidate.visual.y -
                  vector.dy,
                distance:
                  headToTail,
              };
            }
          }

          if (best !== null) {

            vector.position.set(
              best.x,
              best.y,
            );
          }

          clearResultants();
        };


      const createWorkspaceVector =
        (
          kind:
            VectorKind,
          event:
            FederatedPointerEvent,
        ) => {

          const full =
            calculateVector();

          let dx = full.dx;
          let dy = full.dy;

          if (kind === "x") {
            dy = 0;
          }

          if (kind === "y") {
            dx = 0;
          }

          const copy =
            new VectorArrow2D({
              kind,
              position: {
                x:
                  event.global.x,
                y:
                  event.global.y,
              },
              dx,
              dy,
            });

          vectors.push({
            id:
              nextVectorId++,
            visual:
              copy,
          });

          copy.onDropped =
            () => {

              snapVector(
                copy,
              );
            };

          experiment.add(
            copy,
          );

          copy.beginDragging(
            event,
          );

          clearResultants();
        };


      const wireFactory =
        (
          arrow:
            VectorArrow2D,
          kind:
            VectorKind,
        ) => {

          arrow.eventMode =
            "static";

          arrow.cursor =
            "grab";

          arrow.on(
            "pointerdown",
            event => {

              event.stopPropagation();

              createWorkspaceVector(
                kind,
                event,
              );
            },
          );
        };


      const rebuildFactory =
        () => {

          if (factoryVector) {

            experiment.remove(
              factoryVector,
            );

            factoryVector.destroy({
              children: true,
            });
          }

          if (factoryX) {

            experiment.remove(
              factoryX,
            );

            factoryX.destroy({
              children: true,
            });
          }

          if (factoryY) {

            experiment.remove(
              factoryY,
            );

            factoryY.destroy({
              children: true,
            });
          }

          const full =
            calculateVector();

          factoryX =
            new VectorArrow2D({
              kind: "x",
              position:
                FACTORY_ORIGIN,
              dx:
                full.dx,
              dy: 0,
              draggable: false,
            });

          factoryY =
            new VectorArrow2D({
              kind: "y",
              position: {
                x:
                  FACTORY_ORIGIN.x +
                  full.dx,
                y:
                  FACTORY_ORIGIN.y,
              },
              dx: 0,
              dy:
                full.dy,
              draggable: false,
            });

          factoryVector =
            new VectorArrow2D({
              kind: "vector",
              position:
                FACTORY_ORIGIN,
              dx:
                full.dx,
              dy:
                full.dy,
              draggable: false,
            });

          wireFactory(
            factoryX,
            "x",
          );

          wireFactory(
            factoryY,
            "y",
          );

          wireFactory(
            factoryVector,
            "vector",
          );

          /*
           * Components first, full vector last,
           * so the full vector sits visually on top.
           */
          experiment.add(
            factoryX,
          );

          experiment.add(
            factoryY,
          );

          experiment.add(
            factoryVector,
          );
        };


      const magnitudeControl =
        new ValueControl({
          label:
            "Magnitude, cm",
          min: 1,
          max: 10,
          step: 1,
          stepWidth: 25,
          value:
            selectedMagnitude,
          showRandom:
            false,
          showUnlimitedSupply:
            false,
          position: {
            x: 35,
            y: 105,
          },
          onValueChanged:
            value => {

              selectedMagnitude =
                value;

              rebuildFactory();
            },
        });

      experiment.add(
        magnitudeControl,
      );


      const angleControl =
        new ValueControl({
          label:
            "Angle, radians",
          min: 0,
          max: 2,
          step: 1 / 6,
          stepWidth: 44,
          value:
            selectedAnglePi,
          showRandom:
            false,
          showUnlimitedSupply:
            false,
          formatValue:
            value => {
              const sixths =
                Math.round(value * 6);

              if (sixths === 0) return "0";
              if (sixths === 6) return "π";
              if (sixths === 12) return "2π";

              const gcd = (a: number, b: number): number =>
                b === 0 ? Math.abs(a) : gcd(b, a % b);

              const divisor = gcd(sixths, 6);
              const numerator = sixths / divisor;
              const denominator = 6 / divisor;

              if (denominator === 1)
                return numerator === 1 ? "π" : `${numerator}π`;

              return numerator === 1
                ? `π/${denominator}`
                : `${numerator}π/${denominator}`;
            },
          position: {
            x: 35,
            y: 20,
          },
          onValueChanged:
            value => {

              selectedAnglePi =
                value;

              rebuildFactory();
            },
        });

      experiment.add(
        angleControl,
      );


      const addVectors =
        () => {

          clearResultants();

          if (
            vectors.length === 0
          ) {
            return;
          }

          const predecessor =
            new Map<
              number,
              number
            >();

          const successor =
            new Map<
              number,
              number
            >();

          for (
            const first
            of vectors
          ) {

            for (
              const second
              of vectors
            ) {

              if (
                first.id ===
                second.id
              ) {
                continue;
              }

              if (
                samePoint(
                  second.visual.x,
                  second.visual.y,
                  first.visual.headX,
                  first.visual.headY,
                )
              ) {

                if (
                  !predecessor.has(
                    second.id,
                  ) &&
                  !successor.has(
                    first.id,
                  )
                ) {

                  predecessor.set(
                    second.id,
                    first.id,
                  );

                  successor.set(
                    first.id,
                    second.id,
                  );
                }
              }
            }
          }

          const byId =
            new Map(
              vectors.map(
                vector => [
                  vector.id,
                  vector,
                ],
              ),
            );

          const visited =
            new Set<number>();

          const chains:
            LabVector[][] = [];

          for (
            const vector
            of vectors
          ) {

            if (
              predecessor.has(
                vector.id,
              ) ||
              visited.has(
                vector.id,
              )
            ) {
              continue;
            }

            const chain:
              LabVector[] = [];

            let current:
              LabVector | undefined =
                vector;

            while (
              current &&
              !visited.has(
                current.id,
              )
            ) {

              chain.push(
                current,
              );

              visited.add(
                current.id,
              );

              const nextId =
                successor.get(
                  current.id,
                );

              current =
                nextId === undefined
                  ? undefined
                  : byId.get(
                      nextId,
                    );
            }

            if (
              chain.length > 1
            ) {
              chains.push(
                chain,
              );
            }
          }

          for (
            const chain
            of chains
          ) {

            const first =
              chain[0].visual;

            const last =
              chain[
                chain.length - 1
              ].visual;

            const resultant =
              new VectorArrow2D({
                kind:
                  "result",
                position: {
                  x:
                    first.x,
                  y:
                    first.y,
                },
                dx:
                  last.headX -
                  first.x,
                dy:
                  last.headY -
                  first.y,
              });

            resultants.push(
              resultant,
            );

            experiment.add(
              resultant,
            );
          }
        };


      const reset =
        () => {

          clearResultants();

          for (
            const vector
            of vectors
          ) {

            experiment.remove(
              vector.visual,
            );

            vector.visual.destroy({
              children: true,
            });
          }

          vectors.length = 0;
        };


      // ==================================================
      // MEASURING TOOLS
      // ==================================================

      const ruler =
        new Ruler2D(
          0.20,
          {
            x: WORKSPACE_LEFT + 35,
            y: WORKSPACE_TOP + 450,
          },
          PIXELS_PER_METER,
          "horizontal",
        );

      experiment.add(
        ruler,
      );


      const protractor =
        new Protractor2D(
          0.07,
          {
            x: Math.max(
              WORKSPACE_LEFT + 260,
              window.innerWidth - 55,
            ),
            y: WORKSPACE_TOP + 250,
          },
          PIXELS_PER_METER,
        );

      protractor.rotation =
        -Math.PI / 2;

      experiment.add(
        protractor,
      );


      experiment.add(
        makeButton({
          text:
            "Add",
          x:
            WORKSPACE_LEFT,
          y: 25,
          width: 90,
          onClick:
            addVectors,
        }),
      );

      experiment.add(
        makeButton({
          text:
            "Reset",
          x:
            WORKSPACE_LEFT + 105,
          y: 25,
          width: 100,
          onClick:
            reset,
        }),
      );


      rebuildFactory();
    },
  );

  return null;
}


export default function VectorAddition() {

  return (
    <Application
      resizeTo={window}
      backgroundColor={0xe8edf2}
      antialias
    >
      <VectorAdditionContents />
    </Application>
  );
}
