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
  TextControls2D,
} from "../Objects/TextControls2D";


const PIXELS_PER_CM = 96 / 2.54;

const SNAP_DISTANCE_X = 15;
const SNAP_DISTANCE_Y = 20;


function StackingBarsContents() {

  useExperiment2D(
    (experiment: Experiment2D) => {

      const copies: HorizontalBar2D[] = [];


      /*
       * Snap a bar to the closest suitable bar.
       */
      const snapBar = (
        bar: HorizontalBar2D,
        target: HorizontalBar2D
      ) => {

        const candidates = [
          ...copies.filter(
            other => other !== bar
          ),
          target,
        ];


        for (const other of candidates) {

          /*
           * Only snap bars that are already
           * reasonably close vertically.
           */
          if (
            Math.abs(
              bar.y - other.y
            ) > SNAP_DISTANCE_Y
          ) {
            continue;
          }


          const barLeft =
            bar.x;

          const barRight =
            bar.x + bar.widthPixels;

          const otherLeft =
            other.x;

          const otherRight =
            other.x + other.widthPixels;


          /*
           * Left edge of dragged bar
           * snaps to right edge of other bar.
           */
          if (
            Math.abs(
              barLeft - otherRight
            ) < SNAP_DISTANCE_X
          ) {
            bar.x =
              otherRight;

            bar.y =
              other.y;

            return;
          }


          /*
           * Right edge of dragged bar
           * snaps to left edge of other bar.
           */
          if (
            Math.abs(
              barRight - otherLeft
            ) < SNAP_DISTANCE_X
          ) {
            bar.x =
              otherLeft -
              bar.widthPixels;

            bar.y =
              other.y;

            return;
          }


          /*
           * Left edges line up.
           */
          if (
            Math.abs(
              barLeft - otherLeft
            ) < SNAP_DISTANCE_X
          ) {
            bar.x =
              otherLeft;

            bar.y =
              other.y;

            return;
          }


          /*
           * Right edges line up.
           */
          if (
            Math.abs(
              barRight - otherRight
            ) < SNAP_DISTANCE_X
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


      const createDraggableCopy = (
        source: HorizontalBar2D,
        event: FederatedPointerEvent,
        target: HorizontalBar2D
      ) => {

        const copy =
          new HorizontalBar2D({
            lengthCm:
              source.lengthCm,

            showLength:
              true,

            position: {
              x: source.x,
              y: source.y,
            },

            draggable:
              true,

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
       * Target bar
       */
      const target =
        new HorizontalBar2D({
          lengthCm:
            14,

          showLength:
            true,

          position: {
            x: 100,
            y: 500,
          },

          draggable:
            false,

          pixelsPerCm:
            PIXELS_PER_CM,
        });


      /*
       * Source bar A
       */
      let barA:
        HorizontalBar2D;

      barA =
        new HorizontalBar2D({
          lengthCm:
            3,

          showLength:
            true,

          position: {
            x: 100,
            y: 150,
          },

          draggable:
            false,

          pixelsPerCm:
            PIXELS_PER_CM,

          onGrabbed:
            (event) => {
              createDraggableCopy(
                barA,
                event,
                target
              );
            },
        });


      /*
       * Source bar B
       */
      let barB:
        HorizontalBar2D;

      barB =
        new HorizontalBar2D({
          lengthCm:
            5,

          showLength:
            true,

          position: {
            x: 350,
            y: 150,
          },

          draggable:
            false,

          pixelsPerCm:
            PIXELS_PER_CM,

          onGrabbed:
            (event) => {
              createDraggableCopy(
                barB,
                event,
                target
              );
            },
        });


      /*
       * Controls
       */
      const controls =
        new TextControls2D({
          fields: [
            {
              name:
                "barA",

              label:
                "Bar A",

              value:
                3,
            },

            {
              name:
                "barB",

              label:
                "Bar B",

              value:
                5,
            },

            {
              name:
                "target",

              label:
                "Target",

              value:
                14,
            },
          ],

          buttonText:
            "Reset Lengths",

          position: {
            x: 40,
            y: 40,
          },

          onButtonClick:
            (controls) => {

              /*
               * Remove all generated bars.
               */
              for (
                const copy
                of copies
              ) {
                experiment.remove(
                  copy
                );

                copy.destroy();
              }

              copies.length =
                0;


              const lengthA =
                controls.getValue(
                  "barA"
                );

              const lengthB =
                controls.getValue(
                  "barB"
                );

              const targetLength =
                controls.getValue(
                  "target"
                );


              if (
                lengthA <= 0 ||
                lengthB <= 0 ||
                targetLength <= 0
              ) {
                return;
              }


              barA.setLengthCm(
                lengthA
              );

              barB.setLengthCm(
                lengthB
              );

              target.setLengthCm(
                targetLength
              );
            },
        });


      experiment.add(
        controls
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