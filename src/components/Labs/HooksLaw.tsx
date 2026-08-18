import {
  Application,
  useApplication,
  useTick,
} from "@pixi/react";

import {
  FederatedPointerEvent,
} from "pixi.js";

import {
  useEffect,
  useRef,
} from "react";

import {
  useExperiment2D,
} from "./Experiment2D";

import {
  Spring2D,
} from "../Objects/Spring2D";

import {
  Weight2D,
} from "../Objects/Weight2D";

import {
  HorizontalSpringAttachment,
} from "../Objects/HorizontalSpringAttachment";

import {
  MovableSpringAttachment,
} from "../Objects/MovableSpringAttachment";

import {
  SpringPhysics,
} from "../PhysicalSystems/SpringPhysics";

import {
  Timer2D,
} from "../Objects/Timer2D";

import {
  Ruler2D,
} from "../Objects/Ruler2D";

const PIXELS_PER_METER =
  300;


const SNAP_DISTANCE =
  35;


type InteractionMode =
  | "stretch"
  | "detach";



function HooksLawContents() {

  const { app } =
    useApplication();

  const timerRef = useRef<Timer2D | null>(null);

  const physicsRef =
    useRef<SpringPhysics | null>(
      null,
    );


  const springRefs =
    useRef(
      new Map<string, Spring2D>(),
    );


  const weightRefs =
    useRef(
      new Map<string, Weight2D>(),
    );


  const rightAttachmentRef =
    useRef<
      MovableSpringAttachment | null
    >(
      null,
    );


  const interactionModeRef =
    useRef<InteractionMode>(
      "stretch",
    );


  const nextSpringIdRef =
    useRef(1);


  const nextWeightIdRef =
    useRef(1);



  // =====================================================
  // Helpers
  // =====================================================


  const isSpringAttached =
    (
      id: string,
    ) => {

      const physics =
        physicsRef.current;


      if (!physics) {
        return false;
      }


      return physics
        .getChain()
        .some(
          item =>
            item.type === "spring" &&
            item.id === id,
        );
    };


  const isWeightAttached =
    (
      id: string,
    ) => {

      const physics =
        physicsRef.current;


      if (!physics) {
        return false;
      }


      return physics
        .getChain()
        .some(
          item =>
            item.type === "weight" &&
            item.id === id,
        );
    };


  const isRightAnchorAttached =
    () => {

      const physics =
        physicsRef.current;


      if (!physics) {
        return false;
      }


      return physics
        .getChain()
        .some(
          item =>
            item.type === "anchor" &&
            item.id ===
              "rightAnchor",
        );
    };


  const renderChain =
    () => {

      const physics =
        physicsRef.current;


      if (!physics) {
        return;
      }


      for (
        const item of
        physics.getChain()
      ) {

        if (
          item.type === "spring"
        ) {

          const spring =
            springRefs.current.get(
              item.id,
            );


          const state =
            physics.getSpring(
              item.id,
            );


          if (
            !spring ||
            !state
          ) {
            continue;
          }


          spring.x =
            state.position.x *
            PIXELS_PER_METER;


          spring.setCurrentLength(
            state.currentLength,
          );


          continue;
        }


        if (
          item.type === "weight"
        ) {

          const weight =
            weightRefs.current.get(
              item.id,
            );


          const state =
            physics.getWeight(
              item.id,
            );


          if (
            !weight ||
            !state
          ) {
            continue;
          }


          weight.x =
            state.position.x *
            PIXELS_PER_METER;


          continue;
        }


        //
        // Right anchor.
        //

        if (
          item.type === "anchor"
        ) {

          const anchor =
            rightAttachmentRef.current;


          const state =
            physics.getAnchor(
              item.id,
            );


          if (
            !anchor ||
            !state
          ) {
            continue;
          }


          anchor.x =
            state.position.x *
            PIXELS_PER_METER;
        }
      }
    };


  /*const resetAttachedSystem =
    () => {

      const physics =
        physicsRef.current;


      if (!physics) {
        return;
      }


      physics.stop();


      physics
        .resetChainToNaturalLengths();


      renderChain();
    };*/



  // =====================================================
  // Global interaction mode
  // =====================================================


  useEffect(() => {

const onPointerDown =
  (
    event:
      FederatedPointerEvent,
  ) => {

    const physics =
      physicsRef.current;


    if (!physics) {
      return;
    }


    // =================================================
    // LEFT CLICK
    //
    // Stop the current motion and
    // enter normal physical
    // manipulation mode.
    //
    // IMPORTANT:
    // We DO NOT reset spring lengths
    // and we DO NOT move the right
    // anchor.
    // =================================================

    if (
      event.button === 0
    ) {

      interactionModeRef.current =
        "stretch";


      physics.stop();


      //
      // Every attached weight becomes
      // a stretch/compress handle.
      //

      for (
        const item of
        physics.getChain()
      ) {

        if (
          item.type ===
          "weight"
        ) {

          weightRefs.current
            .get(item.id)
            ?.setDragMode(
              "stretch",
            );
        }
      }


      //
      // If the right anchor is attached,
      // left-dragging it also means
      // stretch/compress.
      //

      if (
        isRightAnchorAttached()
      ) {

        rightAttachmentRef.current
          ?.setDragMode(
            "stretch",
          );
      }


      return;
    }


    // =================================================
    // RIGHT CLICK
    //
    // Stop simulation and enter
    // rearrangement / detachment mode.
    //
    // This is the ONE special case
    // where we allow the right anchor
    // to move automatically:
    //
    // all springs return to natural
    // lengths, and the anchor moves to
    // wherever that natural-length
    // configuration places it.
    // =================================================

    if (
      event.button === 2
    ) {

      interactionModeRef.current =
        "detach";


      physics.resetChainToNaturalLengths(
        true,
      );


      renderChain();


      //
      // Attached weights now become
      // ordinary move/detach objects.
      //

      for (
        const item of
        physics.getChain()
      ) {

        if (
          item.type ===
          "weight"
        ) {

          weightRefs.current
            .get(item.id)
            ?.setDragMode(
              "move",
            );
        }
      }


      //
      // Right anchor also becomes
      // movable/detachable.
      //

      if (
        isRightAnchorAttached()
      ) {

        rightAttachmentRef.current
          ?.setDragMode(
            "move",
          );
      }
    }
  };

    app.stage.eventMode =
      "static";


    app.stage.hitArea =
      app.screen;


    app.stage.on(
      "pointerdown",
      onPointerDown,
    );


    return () => {

      app.stage.off(
        "pointerdown",
        onPointerDown,
      );
    };

  }, [app]);



  // =====================================================
  // Experiment
  // =====================================================


  useExperiment2D(
    (experiment) => {

      const physics =
        new SpringPhysics();


      physicsRef.current =
        physics;

      const ruler1 =
        new Ruler2D(
          2,
          {
            x: 100,
            y: 250,
          },
          PIXELS_PER_METER,
          "horizontal"
        );

      experiment.add(ruler1);

      const timer = new Timer2D(600, 400);
      timerRef.current = timer;
      experiment.add(timer);



      //
      // Left support + surface.
      //

      const attachment =
        new HorizontalSpringAttachment({

          position: {
            x: 100,
            y: 350,
          },

          width: 800,

          supportHeight: 100,
        });


      experiment.add(
        attachment,
      );


      //
      // Right movable support.
      //

      const rightAttachment =
        new MovableSpringAttachment({

          id:
            "rightAnchor",

          position: {
            x: 850,
            y: 350,
          },

          supportHeight:
            100,

          minX:
            350,

          maxX:
            900,
        });


      rightAttachmentRef.current =
        rightAttachment;


      experiment.add(
        rightAttachment,
      );


      physics.addAnchor(

        rightAttachment.id,

        {
          x:
            rightAttachment.x /
            PIXELS_PER_METER,

          y:
            rightAttachment.y /
            PIXELS_PER_METER,
        },
      );



      // =================================================
      // Generic spring attachment
      // =================================================


      const tryAttachSpring =
        (
          spring:
            Spring2D,
        ) => {

          if (
            isSpringAttached(
              spring.id,
            )
          ) {
            return;
          }


          const chain =
            physics.getChain();


          //
          // First spring -> left wall.
          //

          if (
            chain.length === 0
          ) {

            const closest =
              attachment
                .getClosestSpringAttachmentPosition(
                  spring.y,
                );


            const dx =
              spring.x -
              closest.x;


            const dy =
              spring.y -
              closest.y;


            const distance =
              Math.sqrt(
                dx * dx +
                dy * dy,
              );


            if (
              distance >
              SNAP_DISTANCE
            ) {

              physics.setSpringPosition(
                spring.id,

                {
                  x:
                    spring.x /
                    PIXELS_PER_METER,

                  y:
                    spring.y /
                    PIXELS_PER_METER,
                },
              );


              return;
            }


            spring.position.set(
              closest.x,
              closest.y,
            );


            physics.setSpringPosition(
              spring.id,

              {
                x:
                  spring.x /
                  PIXELS_PER_METER,

                y:
                  spring.y /
                  PIXELS_PER_METER,
              },
            );


            physics.attach(
              "frame",
              "wall",

              "spring",
              spring.id,
            );


            return;
          }


          const last =
            chain[
              chain.length - 1
            ];


          //
          // Cannot attach anything
          // after right anchor.
          //

          if (
            last.type === "anchor"
          ) {
            return;
          }


          let target:
            {
              x: number;
              y: number;
            };


          if (
            last.type ===
            "spring"
          ) {

            const parent =
              springRefs.current.get(
                last.id,
              );


            if (!parent) {
              return;
            }


            target =
              parent
                .getFreeEndPosition();

          } else {

            const parent =
              weightRefs.current.get(
                last.id,
              );


            if (!parent) {
              return;
            }


            target =
              parent
                .getRightAttachmentPosition();
          }


          const dx =
            spring.x -
            target.x;


          const dy =
            spring.y -
            target.y;


          const distance =
            Math.sqrt(
              dx * dx +
              dy * dy,
            );


          if (
            distance >
              SNAP_DISTANCE
          ) {

            physics.setSpringPosition(
              spring.id,

              {
                x:
                  spring.x /
                  PIXELS_PER_METER,

                y:
                  spring.y /
                  PIXELS_PER_METER,
              },
            );


            return;
          }


          spring.position.set(
            target.x,
            target.y,
          );


          physics.setSpringPosition(
            spring.id,

            {
              x:
                spring.x /
                PIXELS_PER_METER,

              y:
                spring.y /
                PIXELS_PER_METER,
            },
          );


          physics.attach(
            last.type,
            last.id,

            "spring",
            spring.id,
          );


          renderChain();
        };



      // =================================================
      // Generic weight attachment
      // =================================================


      const tryAttachWeight =
        (
          weight:
            Weight2D,
        ) => {

          if (
            isWeightAttached(
              weight.id,
            )
          ) {
            return;
          }


          const chain =
            physics.getChain();


          if (
            chain.length === 0
          ) {

            physics.setWeightPosition(
              weight.id,

              {
                x:
                  weight.x /
                  PIXELS_PER_METER,

                y:
                  weight.y /
                  PIXELS_PER_METER,
              },
            );


            return;
          }


          const last =
            chain[
              chain.length - 1
            ];


          if (
            last.type === "anchor"
          ) {
            return;
          }


          let target:
            {
              x: number;
              y: number;
            };


          if (
            last.type === "spring"
          ) {

            const parent =
              springRefs.current.get(
                last.id,
              );


            if (!parent) {
              return;
            }


            target =
              parent
                .getFreeEndPosition();

          } else {

            const parent =
              weightRefs.current.get(
                last.id,
              );


            if (!parent) {
              return;
            }


            target =
              parent
                .getRightAttachmentPosition();
          }


          const weightLeft =
            weight
              .getLeftAttachmentPosition();


          const dx =
            weightLeft.x -
            target.x;


          const dy =
            weightLeft.y -
            target.y;


          const distance =
            Math.sqrt(
              dx * dx +
              dy * dy,
            );


          if (
            distance >
              SNAP_DISTANCE
          ) {

            physics.setWeightPosition(
              weight.id,

              {
                x:
                  weight.x /
                  PIXELS_PER_METER,

                y:
                  weight.y /
                  PIXELS_PER_METER,
              },
            );


            return;
          }


          const attached =
            physics.attach(
              last.type,
              last.id,

              "weight",
              weight.id,
            );


          if (!attached) {
            return;
          }


          if (
            last.type ===
            "spring"
          ) {

            const parentSpring =
              springRefs.current.get(
                last.id,
              );


            if (parentSpring) {

              weight.y =
                parentSpring.y -
                weight.getWeightSize() /
                  2;
            }

          } else {

            const parentWeight =
              weightRefs.current.get(
                last.id,
              );


            if (parentWeight) {

              weight.y =
                parentWeight.y;
            }
          }


          renderChain();


          weight.setDragMode(
            "stretch",
          );
        };



      // =================================================
      // Wire a real spring
      // =================================================


      const wireSpring =
        (
          spring:
            Spring2D,
        ) => {

          spring.setOnLeftDragStart(
            () => {

              physics.stop();


              if (
                !isSpringAttached(
                  spring.id,
                )
              ) {

                return true;
              }


              if (
                interactionModeRef.current !==
                "detach"
              ) {

                return false;
              }


              return physics
                .disconnectChild(
                  "spring",
                  spring.id,
                );
            },
          );


          spring.setOnDragEnd(
            () => {

              tryAttachSpring(
                spring,
              );
            },
          );
        };



      // =================================================
      // Wire a real weight
      // =================================================


      const wireWeight =
        (
          weight:
            Weight2D,
        ) => {

          weight.setOnMoveDragStart(
            () => {

              physics.stop();


              if (
                !isWeightAttached(
                  weight.id,
                )
              ) {

                return true;
              }


              if (
                interactionModeRef.current !==
                "detach"
              ) {

                return false;
              }


              return physics
                .disconnectChild(
                  "weight",
                  weight.id,
                );
            },
          );


          weight.setOnMoveDragEnd(
            () => {

              tryAttachWeight(
                weight,
              );
            },
          );


          weight.setOnStretchMove(
            mouse => {

              if (
                !isWeightAttached(
                  weight.id,
                )
              ) {

                return;
              }


              physics.stop();


              physics.manuallyMoveWeight(

                weight.id,

                mouse.x /
                  PIXELS_PER_METER,
              );


              renderChain();
            },
          );


          weight.setOnStretchEnd(
            () => {

              if (
                !isWeightAttached(
                  weight.id,
                )
              ) {

                return;
              }


              physics.start();
            },
          );


          weight.setOnRightClick(
            () => {},
          );
        };



      // =================================================
      // Right anchor attachment
      // =================================================


      const tryAttachRightAnchor =
        () => {

          if (
            isRightAnchorAttached()
          ) {

            return;
          }


          const chain =
            physics.getChain();


          if (
            chain.length === 0
          ) {
            return;
          }


          const last =
            chain[
              chain.length - 1
            ];


          //
          // Right anchor may only
          // attach to a spring.
          //

          if (
            last.type !== "spring"
          ) {

            physics.setAnchorPosition(

              rightAttachment.id,

              {
                x:
                  rightAttachment.x /
                  PIXELS_PER_METER,

                y:
                  rightAttachment.y /
                  PIXELS_PER_METER,
              },
            );


            return;
          }


          const spring =
            springRefs.current.get(
              last.id,
            );


          if (!spring) {
            return;
          }


          const springEnd =
            spring
              .getFreeEndPosition();


          const closest =
            rightAttachment
              .getClosestSpringAttachmentPosition(
                springEnd.y,
              );


          const dx =
            springEnd.x -
            closest.x;


          const dy =
            springEnd.y -
            closest.y;


          const distance =
            Math.sqrt(
              dx * dx +
              dy * dy,
            );


          if (
            distance >
              SNAP_DISTANCE
          ) {

            physics.setAnchorPosition(

              rightAttachment.id,

              {
                x:
                  rightAttachment.x /
                  PIXELS_PER_METER,

                y:
                  rightAttachment.y /
                  PIXELS_PER_METER,
              },
            );


            return;
          }


          //
          // Put anchor exactly at
          // spring endpoint.
          //

          rightAttachment.x =
            springEnd.x;


          physics.setAnchorPosition(

            rightAttachment.id,

            {
              x:
                rightAttachment.x /
                  PIXELS_PER_METER,

              y:
                rightAttachment.y /
                  PIXELS_PER_METER,
            },
          );


          const attached =
            physics.attach(
              "spring",
              spring.id,

              "anchor",
              rightAttachment.id,
            );


          if (!attached) {
            return;
          }


          rightAttachment
            .setDragMode(
              "stretch",
            );


          renderChain();
        };



      rightAttachment
        .setOnMoveDragStart(
          () => {

            physics.stop();


            if (
              !isRightAnchorAttached()
            ) {

              return true;
            }


            if (
              interactionModeRef.current !==
                "detach"
            ) {

              return false;
            }


            return physics
              .disconnectChild(
                "anchor",
                rightAttachment.id,
              );
          },
        );


      rightAttachment
        .setOnMoveDragEnd(
          () => {

            //
            // Keep free anchor state
            // synchronized.
            //

            physics.setAnchorPosition(

              rightAttachment.id,

              {
                x:
                  rightAttachment.x /
                    PIXELS_PER_METER,

                y:
                  rightAttachment.y /
                    PIXELS_PER_METER,
              },
            );


            tryAttachRightAnchor();
          },
        );


      rightAttachment
        .setOnStretchMove(
          mouse => {

            if (
              !isRightAnchorAttached()
            ) {

              return;
            }


            physics.stop();


            physics.manuallyMoveAnchor(

              rightAttachment.id,

              mouse.x /
                PIXELS_PER_METER,
            );


            renderChain();
          },
        );


      rightAttachment
        .setOnStretchEnd(
          () => {

            if (
              !isRightAnchorAttached()
            ) {

              return;
            }


            //
            // The anchor itself will
            // remain fixed, but weights
            // are now free to oscillate.
            //

            physics.start();
          },
        );



      // =================================================
      // Spring factories
      // =================================================


      const createSpringFactory =
        (
          k: number,
          x: number,
        ) => {

          const spring =
            new Spring2D({

              id:
                `spring${nextSpringIdRef.current++}`,

              position: {
                x,
                y: 105,
              },

              length:
                0.5,

              k,

              pixelsPerMeter:
                PIXELS_PER_METER,

              orientation:
                "horizontal",
            });


          experiment.add(
            spring,
          );


          spring.setOnLeftDragStart(
            () => {

              physics.stop();


              springRefs.current.set(
                spring.id,
                spring,
              );


              physics.addSpring(

                spring.id,

                {
                  x:
                    spring.x /
                      PIXELS_PER_METER,

                  y:
                    spring.y /
                      PIXELS_PER_METER,
                },

                spring.naturalLength,

                spring.k,

                spring.orientation,
              );


              wireSpring(
                spring,
              );


              createSpringFactory(
                k,
                x,
              );


              return true;
            },
          );
        };


      createSpringFactory(
        20,
        250,
      );


      createSpringFactory(
        30,
        475,
      );


      createSpringFactory(
        40,
        700,
      );



      // =================================================
      // 1 kg factory
      // =================================================


      const createWeightFactory =
        () => {

          const weight =
            new Weight2D({

              id:
                `weight${nextWeightIdRef.current++}`,

              position: {
                x: 125,
                y: 80,
              },

              mass:
                1,

              size:
                50,
            });


          experiment.add(
            weight,
          );


          weight.setDragMode(
            "move",
          );


          weight.setOnMoveDragStart(
            () => {

              physics.stop();


              weightRefs.current.set(
                weight.id,
                weight,
              );


              physics.addWeight(

                weight.id,

                {
                  x:
                    weight.x /
                      PIXELS_PER_METER,

                  y:
                    weight.y /
                      PIXELS_PER_METER,
                },

                weight.mass,

                weight.getWeightSize() /
                  PIXELS_PER_METER,
              );


              wireWeight(
                weight,
              );


              createWeightFactory();


              return true;
            },
          );
        };


      createWeightFactory();
    },
  );



  // =====================================================
  // Dynamics
  // =====================================================


  useTick(
    ticker => {

      const physics = physicsRef.current;
      const timer = timerRef.current;

      const deltaTime = ticker.deltaMS / 1000;
      timer?.update(deltaTime);

      if (
        !physics ||
        !physics.isRunning()
      ) {
        return;
      }

      physics.move( deltaTime);

      renderChain();
    },
  );


  return null;
}



export default function HooksLaw() {

  return (
    <div
      onContextMenu={
        event =>
          event.preventDefault()
      }
    >
      <Application
        width={1000}
        height={550}
        backgroundColor={0xf5f5f5}
      >
        <HooksLawContents />
      </Application>
    </div>
  );
}