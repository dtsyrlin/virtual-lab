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
const MIN_COMPONENT_CM = 0.25;
const MIN_COMPONENT_PIXELS =
  MIN_COMPONENT_CM * PIXELS_PER_CENTIMETER;

const FACTORY_ORIGIN = {
  x: 305,
  y: 320,
};

const FACTORY_Y_AXIS_TOP = 90;
const FACTORY_Y_AXIS_BOTTOM = 580;

const WORKSPACE_LEFT = 620;
const WORKSPACE_TOP = 20;
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

  public dx: number;
  public dy: number;

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

    if (draggable) {
      this.enableDragging();
    }
  }


  public get headX(): number {
    return this.x + this.dx;
  }


  public get headY(): number {
    return this.y + this.dy;
  }


  public setDelta(
    dx: number,
    dy: number,
  ) {
    this.dx = dx;
    this.dy = dy;
    this.redraw();
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
    if (Math.hypot(this.dx, this.dy) < MIN_COMPONENT_PIXELS) {
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

  const drawBackground =
    (pressed: boolean) => {
      background.clear();

      background
        .roundRect(
          0,
          0,
          width,
          40,
          7,
        )
        .fill(
          pressed
            ? 0xcbd5e1
            : 0xf8fafc,
        )
        .stroke({
          width: 2,
          color: pressed
            ? 0x334155
            : 0x64748b,
        });
    };

  drawBackground(false);

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

  const release =
    () => {
      drawBackground(false);
      label.position.y = 20;
    };

  button.on(
    "pointerdown",
    () => {
      drawBackground(true);
      label.position.y = 21;
      onClick();
    },
  );

  button.on(
    "pointerup",
    release,
  );

  button.on(
    "pointerupoutside",
    release,
  );

  button.on(
    "pointerout",
    release,
  );

  return button;
}

function VectorAdditionContents() {

  useExperiment2D(
    (
      experiment:
        Experiment2D,
    ) => {

      // The factory vector is edited directly by dragging its tip.
      let factoryDx =
        5 * PIXELS_PER_CENTIMETER * Math.cos(Math.PI / 6);
      let factoryDy =
        -5 * PIXELS_PER_CENTIMETER * Math.sin(Math.PI / 6);

      const groupCenters: { x: number; y: number }[] = [];

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
        // +x arrowhead
        .moveTo(
          555,
          FACTORY_ORIGIN.y,
        )
        .lineTo(
          547,
          FACTORY_ORIGIN.y - 5,
        )
        .moveTo(
          555,
          FACTORY_ORIGIN.y,
        )
        .lineTo(
          547,
          FACTORY_ORIGIN.y + 5,
        )
        .moveTo(
          FACTORY_ORIGIN.x,
          FACTORY_Y_AXIS_TOP,
        )
        .lineTo(
          FACTORY_ORIGIN.x,
          FACTORY_Y_AXIS_BOTTOM,
        )
        // +y arrowhead
        .moveTo(
          FACTORY_ORIGIN.x,
          FACTORY_Y_AXIS_TOP,
        )
        .lineTo(
          FACTORY_ORIGIN.x - 5,
          FACTORY_Y_AXIS_TOP + 8,
        )
        .moveTo(
          FACTORY_ORIGIN.x,
          FACTORY_Y_AXIS_TOP,
        )
        .lineTo(
          FACTORY_ORIGIN.x + 5,
          FACTORY_Y_AXIS_TOP + 8,
        )
        .stroke({
          width: 1.5,
          color: 0x94a3b8,
        });

      experiment.add(
        factoryAxes,
      );

      const xAxisLabel =
        new Text({
          text: "x",
          style: {
            fontSize: 18,
            fill: 0x475569,
            fontStyle: "italic",
          },
        });

      xAxisLabel.position.set(
        535,
        FACTORY_ORIGIN.y - 22,
      );

      experiment.add(
        xAxisLabel,
      );

      const yAxisLabel =
        new Text({
          text: "y",
          style: {
            fontSize: 18,
            fill: 0x475569,
            fontStyle: "italic",
          },
        });

      yAxisLabel.position.set(
        FACTORY_ORIGIN.x + 10,
        FACTORY_Y_AXIS_TOP + 12,
      );

      experiment.add(
        yAxisLabel,
      );


      let factoryVector:
        VectorArrow2D;

      let factoryX:
        VectorArrow2D;

      let factoryY:
        VectorArrow2D;


      const calculateVector =
        () => ({
          dx: factoryDx,
          dy: factoryDy,
        });


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

          
        };



      const rebuildFactory =
        () => {

          if (factoryVector) {
            experiment.remove(factoryVector);
            factoryVector.destroy({ children: true });
          }
          if (factoryX) {
            experiment.remove(factoryX);
            factoryX.destroy({ children: true });
          }
          if (factoryY) {
            experiment.remove(factoryY);
            factoryY.destroy({ children: true });
          }

          const full = calculateVector();

          factoryX = new VectorArrow2D({
            kind: "x",
            position: FACTORY_ORIGIN,
            dx: full.dx,
            dy: 0,
            draggable: false,
          });

          factoryY = new VectorArrow2D({
            kind: "y",
            position: {
              x: FACTORY_ORIGIN.x + full.dx,
              y: FACTORY_ORIGIN.y,
            },
            dx: 0,
            dy: full.dy,
            draggable: false,
          });

          factoryVector = new VectorArrow2D({
            kind: "vector",
            position: FACTORY_ORIGIN,
            dx: full.dx,
            dy: full.dy,
            draggable: false,
          });

          // Invisible, generous hit target at the vector tip.
          const tip = new Graphics();
          tip.circle(full.dx, full.dy, 15).fill({
            color: 0xffffff,
            alpha: 0.001,
          });
          tip.eventMode = "static";
          tip.cursor = "grab";
          factoryVector.addChild(tip);

          let draggingTip = false;

          tip.on("pointerdown", event => {
            event.stopPropagation();
            draggingTip = true;
          });

          tip.on("globalpointermove", event => {
            if (!draggingTip) return;

            let dx = event.global.x - FACTORY_ORIGIN.x;
            let dy = event.global.y - FACTORY_ORIGIN.y;

            // Factory supports magnitudes from 0 to 10 cm.
            const maxLength = 10 * PIXELS_PER_CENTIMETER;
            const length = Math.hypot(dx, dy);
            if (length > maxLength && length > 0) {
              dx = dx / length * maxLength;
              dy = dy / length * maxLength;
            }

            factoryDx = dx;
            factoryDy = dy;

            factoryVector.setDelta(factoryDx, factoryDy);
            factoryX.setDelta(factoryDx, 0);
            factoryY.position.set(
              FACTORY_ORIGIN.x + factoryDx,
              FACTORY_ORIGIN.y,
            );
            factoryY.setDelta(0, factoryDy);

            // Keep the tip hit area at the current head.
            tip.clear();
            tip.circle(factoryDx, factoryDy, 15).fill({
              color: 0xffffff,
              alpha: 0.001,
            });
          });

          const stopTipDrag = () => {
            draggingTip = false;
          };
          tip.on("pointerup", stopTipDrag);
          tip.on("pointerupoutside", stopTipDrag);

          experiment.add(factoryX);
          experiment.add(factoryY);
          experiment.add(factoryVector);
        };


      const chooseGroupCenter = () => {
        const full = calculateVector();
        const vectorReach = Math.max(
          Math.abs(full.dx),
          Math.abs(full.dy),
          60,
        );
        const padding = vectorReach + 35;

        const minX = WORKSPACE_LEFT + padding;
        const maxX = WORKSPACE_LEFT + workspaceWidth - padding;
        const minY = WORKSPACE_TOP + 75 + padding;
        const maxY = WORKSPACE_TOP + workspaceHeight - 75 - padding;

        let best = {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
        };
        let bestSeparation = -1;

        // Try several random positions and keep the one farthest from
        // previously created groups. This reduces overlap without making
        // placement look artificially regular.
        for (let attempt = 0; attempt < 24; attempt++) {
          const x = minX < maxX
            ? minX + Math.random() * (maxX - minX)
            : WORKSPACE_LEFT + workspaceWidth / 2;
          const y = minY < maxY
            ? minY + Math.random() * (maxY - minY)
            : WORKSPACE_TOP + workspaceHeight / 2;

          const separation = groupCenters.length === 0
            ? Number.POSITIVE_INFINITY
            : Math.min(...groupCenters.map(center =>
                distance(x, y, center.x, center.y),
              ));

          if (separation > bestSeparation) {
            best = { x, y };
            bestSeparation = separation;
          }
        }

        groupCenters.push(best);
        return best;
      };


      const createVectorGroup = () => {
        

        const full = calculateVector();
        const center = chooseGroupCenter();
        const jitter = 18;

        const specs: {
          kind: VectorKind;
          dx: number;
          dy: number;
        }[] = [
          { kind: "vector", dx: full.dx, dy: full.dy },
          { kind: "x", dx: full.dx, dy: 0 },
          { kind: "y", dx: 0, dy: full.dy },
        ];

        for (const spec of specs) {
          // Magnitude-zero vector/component does not exist in the workspace.
          if (Math.hypot(spec.dx, spec.dy) < MIN_COMPONENT_PIXELS) continue;

          const copy = new VectorArrow2D({
            kind: spec.kind,
            position: {
              x: center.x + (Math.random() * 2 - 1) * jitter,
              y: center.y + (Math.random() * 2 - 1) * jitter,
            },
            dx: spec.dx,
            dy: spec.dy,
          });

          vectors.push({
            id: nextVectorId++,
            visual: copy,
          });

          copy.onDropped = () => snapVector(copy);
          experiment.add(copy);
        }
      };


      const addVectors =
        () => {

          

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
          groupCenters.length = 0;
        };


      // ==================================================
      // MEASURING TOOLS
      // ==================================================

      const ruler =
        new Ruler2D(
          0.20,
          {
            x: WORKSPACE_LEFT + 35,
            y: Math.max(
              WORKSPACE_TOP + 300,
              window.innerHeight - 75,
            ),
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


      // Add / Reset now occupy the former control area.
      experiment.add(
        makeButton({
          text: "Add",
          x: WORKSPACE_LEFT - 105,
          y: 25,
          width: 90,
          onClick: addVectors,
        }),
      );

      experiment.add(
        makeButton({
          text: "Clear",
          x: WORKSPACE_LEFT - 105,
          y: 75,
          width: 90,
          onClick: reset,
        }),
      );

      // Small transfer button between the factory plane and workspace.
      experiment.add(
        makeButton({
          text: ">",
          x: WORKSPACE_LEFT - 42,
          y: FACTORY_ORIGIN.y - 20,
          width: 34,
          onClick: createVectorGroup,
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
