import {
  Application,
} from "@pixi/react";

import {
  FederatedPointerEvent,
} from "pixi.js";

import {
  Experiment2D,
  useExperiment2D,
} from "./Experiment2D";

import {
  HorizontalBar2D,
} from "../Objects/HorizontalBar2D";

import {
  HorizontalBarControl,
} from "../Objects/HorizontalBarControl";

import {
  Ruler2D,
} from "../Objects/Ruler2D";


const PIXELS_PER_CM =
  96 / 2.54;

const SNAP_DISTANCE_X =
  15;

const SNAP_DISTANCE_Y =
  20;


function randomInteger(
  min: number,
  max: number
): number {

  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
}


function StackingBarsContents() {

  useExperiment2D(
    (experiment: Experiment2D) => {

      const copies:
        HorizontalBar2D[] = [];

      const sourceBars:
        HorizontalBar2D[] = [];


      const clearCopies = () => {

        for (
          const copy
          of copies
        ) {

          experiment.remove(
            copy
          );

          copy.destroy();
        }

        copies.length = 0;
      };


      /*
       * Snap a bar to another
       * bar or to the target.
       */
      const snapBar = (
        bar: HorizontalBar2D,
        target: HorizontalBar2D
      ) => {

        const candidates = [
          ...sourceBars,
          ...copies,
          target,
        ].filter(
          other =>
            other !== bar
        );


        for (
          const other
          of candidates
        ) {

          /*
          * Snap left edges when bars
          * are stacked vertically.
          */
          const stackedVertically =
            Math.abs(
              (bar.y + bar.height) -
              other.y
            ) < SNAP_DISTANCE_Y ||
            Math.abs(
              (other.y + other.height) -
              bar.y
            ) < SNAP_DISTANCE_Y;

          if (
            stackedVertically &&
            Math.abs(
              bar.x - other.x
            ) < SNAP_DISTANCE_X
          ) {

            bar.x =
              other.x;

            return;
          }

          if (
            stackedVertically &&
            Math.abs(
              (bar.x + bar.widthPixels) -
              (other.x + other.widthPixels)
            ) < SNAP_DISTANCE_X
          ) {

            bar.x =
              other.x +
              other.widthPixels -
              bar.widthPixels;

            return;
          }


          /*
          * Existing same-row snapping.
          */
          if (
            Math.abs(
              bar.y -
              other.y
            ) >
            SNAP_DISTANCE_Y
          ) {
            continue;
          }

          const barLeft =
            bar.x;

          const barRight =
            bar.x +
            bar.widthPixels;

          const otherLeft =
            other.x;

          const otherRight =
            other.x +
            other.widthPixels;


          /*
           * Left edge to
           * other right edge.
           */
          if (
            Math.abs(
              barLeft -
              otherRight
            ) <
            SNAP_DISTANCE_X
          ) {

            bar.x =
              otherRight;

            bar.y =
              other.y;

            return;
          }


          /*
           * Right edge to
           * other left edge.
           */
          if (
            Math.abs(
              barRight -
              otherLeft
            ) <
            SNAP_DISTANCE_X
          ) {

            bar.x =
              otherLeft -
              bar.widthPixels;

            bar.y =
              other.y;

            return;
          }


          /*
           * Left edges.
           */
          if (
            Math.abs(
              barLeft -
              otherLeft
            ) <
            SNAP_DISTANCE_X
          ) {

            bar.x =
              otherLeft;

            bar.y =
              other.y;

            return;
          }


          /*
           * Right edges.
           */
          if (
            Math.abs(
              barRight -
              otherRight
            ) <
            SNAP_DISTANCE_X
          ) {

            bar.x =
              otherRight -
              bar.widthPixels;

            bar.y =
              other.y;

            return;
          }
        }
      };


      /*
       * Target bar
       */
      const target =
        new HorizontalBar2D({
          lengthCm: 14,

          showLength: true,

          position: {
            x: 100,
            y: 500,
          },

          draggable: false,

          pixelsPerCm:
            PIXELS_PER_CM,
        });


      /*
       * Create a draggable copy
       * when a source bar is in
       * unlimited-supply mode.
       */
      const createDraggableCopy = (
        source:
          HorizontalBar2D,

        event:
          FederatedPointerEvent
      ) => {

        const copy =
          new HorizontalBar2D({
            lengthCm:
              source.lengthCm,

            showLength:
              source.showLength,

            position: {
              x: source.x,
              y: source.y,
            },

            draggable:
              true,

            dragBehavior:
              "move",

            pixelsPerCm:
              PIXELS_PER_CM,
          });


        copy.onDropped =
          () => {

            snapBar(
              copy,
              target
            );
          };


        copies.push(
          copy
        );

        experiment.add(
          copy
        );

        copy.beginDragging(
          event
        );
      };


      /*
       * Bar A
       */
      const barA =
        new HorizontalBar2D({
          lengthCm: 3,

          showLength: true,

          position: {
            x: 100,
            y: 250,
          },

          draggable: true,

          dragBehavior:
            "clone",

          pixelsPerCm:
            PIXELS_PER_CM,

          onCloneRequested:
            (
              source,
              event
            ) => {

              createDraggableCopy(
                source,
                event
              );
            },
        });


      /*
       * Bar B
       */
      const barB =
        new HorizontalBar2D({
          lengthCm: 5,

          showLength: true,

          position: {
            x: 550,
            y: 250,
          },

          draggable: true,

          dragBehavior:
            "clone",

          pixelsPerCm:
            PIXELS_PER_CM,

          onCloneRequested:
            (
              source,
              event
            ) => {

              createDraggableCopy(
                source,
                event
              );
            },
        });


      sourceBars.push(
        barA,
        barB
      );


      /*
       * If unlimited supply is
       * turned off, the original
       * bar itself moves and can snap.
       */
      barA.onDropped =
        () => {

          snapBar(
            barA,
            target
          );
        };


      barB.onDropped =
        () => {

          snapBar(
            barB,
            target
          );
        };


      /*
       * Bar A control
       */
      const barAControl =
        new HorizontalBarControl({
          label:
            "Bar A",

          min:
            2,

          max:
            7,

          value:
            3,

          unlimitedSupply:
            true,

          position: {
            x: 40,
            y: 30,
          },

          onValueChanged:
            (value) => {

              clearCopies();


              if (
                value <= 1
              ) {

                barA.setLengthCm(
                  randomInteger(
                    2,
                    7
                  )
                );

                barA.setShowLength(
                  false
                );

              } else {

                barA.setLengthCm(
                  value
                );

                barA.setShowLength(
                  true
                );
              }
            },

          onUnlimitedSupplyChanged:
            (
              unlimited
            ) => {

              barA.setDragBehavior(
                unlimited
                  ? "clone"
                  : "move"
              );
            },
        });


      /*
       * Bar B control
       */
      const barBControl =
        new HorizontalBarControl({
          label:
            "Bar B",

          min:
            2,

          max:
            7,

          value:
            5,

          unlimitedSupply:
            true,

          position: {
            x: 40,
            y: 90,
          },

          onValueChanged:
            (value) => {

              clearCopies();


              if (
                value <= 1
              ) {

                barB.setLengthCm(
                  randomInteger(
                    2,
                    7
                  )
                );

                barB.setShowLength(
                  false
                );

              } else {

                barB.setLengthCm(
                  value
                );

                barB.setShowLength(
                  true
                );
              }
            },

          onUnlimitedSupplyChanged:
            (
              unlimited
            ) => {

              barB.setDragBehavior(
                unlimited
                  ? "clone"
                  : "move"
              );
            },
        });


      /*
       * Target control
       *
       * No unlimited-supply
       * checkbox because target
       * cannot be dragged.
       */
      const targetControl =
        new HorizontalBarControl({
          label:
            "Target",

          min:
            2,

          max:
            30,

          value:
            14,

          showUnlimitedSupply:
            false,

          position: {
            x: 40,
            y: 150,
          },

          onValueChanged:
            (value) => {

              clearCopies();


              if (
                value <= 1
              ) {

                target.setLengthCm(
                  randomInteger(
                    1,
                    30
                  )
                );

                target.setShowLength(
                  false
                );

              } else {

                target.setLengthCm(
                  value
                );

                target.setShowLength(
                  true
                );
              }
            },
        });

      const ruler =
        new Ruler2D(
          0.1,
          {
            x: 1200,
            y: 500,
          },
          PIXELS_PER_CM * 100, // pixels per meter
          "vertical"
        );

      experiment.add(ruler);


      experiment.add(
        barAControl
      );

      experiment.add(
        barBControl
      );

      experiment.add(
        targetControl
      );


      experiment.add(
        barA
      );

      experiment.add(
        barB
      );

      experiment.add(
        target
      );

    }
  );


  return null;
}


export default function StackingBars() {

  return (

    <Application
      resizeTo={window}
      backgroundColor={0xe8edf2}
      antialias
    >
      <StackingBarsContents />
    </Application>

  );
}