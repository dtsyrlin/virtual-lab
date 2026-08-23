import {
  Application,
  useApplication,
  useTick,
} from "@pixi/react";

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
  VerticalSpringAttachment,
} from "../Objects/VerticalSpringAttachment";

import {
  VerticalSpringPhysics,
} from "../PhysicalSystems/VerticalSpringPhysics";

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



function VerticalHooksLawContents() {

  const { app } =
    useApplication();


  const timerRef =
    useRef<Timer2D | null>(
      null,
    );


  const physicsRef =
    useRef<
      VerticalSpringPhysics | null
    >(
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


  const nextSpringIdRef =
    useRef(1);


  const nextWeightIdRef =
    useRef(1);


  const pointerPositionRef =
    useRef<{
      x: number;
      y: number;
    } | null>(null);



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


          spring.y =
            state.position.y *
            PIXELS_PER_METER;


          spring.setCurrentLength(
            state.currentLength,
          );


          continue;
        }


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


        weight.y =
          state.position.y *
          PIXELS_PER_METER;
      }
    };



  // =====================================================
  // Pointer tracking for damping
  // =====================================================


  useEffect(() => {

    const canvas =
      app.canvas;


    const onCanvasPointerMove =
      (
        event:
          PointerEvent,
      ) => {

        const rect =
          canvas
            .getBoundingClientRect();


        pointerPositionRef.current = {

          x:
            (
              event.clientX -
              rect.left
            ) *
            app.screen.width /
            rect.width,

          y:
            (
              event.clientY -
              rect.top
            ) *
            app.screen.height /
            rect.height,
        };
      };


    const onCanvasPointerLeave =
      () => {

        pointerPositionRef.current =
          null;
      };


    canvas.addEventListener(
      "pointermove",
      onCanvasPointerMove,
    );


    canvas.addEventListener(
      "pointerleave",
      onCanvasPointerLeave,
    );


    return () => {

      canvas.removeEventListener(
        "pointermove",
        onCanvasPointerMove,
      );


      canvas.removeEventListener(
        "pointerleave",
        onCanvasPointerLeave,
      );
    };

  }, [app]);



  // =====================================================
  // Experiment
  // =====================================================


  useExperiment2D(
    (
      experiment,
    ) => {

      const physics =
        new VerticalSpringPhysics();


      physicsRef.current =
        physics;



      // =================================================
      // Ruler
      // =================================================


      const ruler =
        new Ruler2D(
          1.5,

          {
            x: 80,
            y: 500,
          },

          PIXELS_PER_METER,

          "vertical",
        );


      experiment.add(
        ruler,
      );



      // =================================================
      // Timer
      // =================================================


      const timer =
        new Timer2D(
          760,
          420,
        );


      timerRef.current =
        timer;


      experiment.add(
        timer,
      );



      // =================================================
      // Top support
      // =================================================


    const attachment =
      new VerticalSpringAttachment({

        position: {
          x: 180,
          y: 40,
        },

        height: 500,

        armLength: 150,

        thickness: 8,
      });

      experiment.add(
        attachment,
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



          // ---------------------------------------------
          // First spring -> ceiling.
          // ---------------------------------------------


          if (
            chain.length === 0
          ) {

            const closest =
              attachment
                .getClosestSpringAttachmentPosition(
                  spring.x,
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
              "ceiling",

              "spring",
              spring.id,
            );


            renderChain();


            return;
          }



          // ---------------------------------------------
          // Attach to bottom of existing chain.
          // ---------------------------------------------


          const last =
            chain[
              chain.length - 1
            ];


          let target:
            {
              x: number;
              y: number;
            };


          if (
            last.type === "spring"
          ) {

            const parentSpring =
              springRefs.current.get(
                last.id,
              );


            if (!parentSpring) {
              return;
            }


            target =
              parentSpring
                .getFreeEndPosition();

          } else {

            const parentWeight =
              weightRefs.current.get(
                last.id,
              );


            if (!parentWeight) {
              return;
            }


            target =
              parentWeight
                .getBottomAttachmentPosition();
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


          let target:
            {
              x: number;
              y: number;
            };


          if (
            last.type === "spring"
          ) {

            const parentSpring =
              springRefs.current.get(
                last.id,
              );


            if (!parentSpring) {
              return;
            }


            target =
              parentSpring
                .getFreeEndPosition();

          } else {

            const parentWeight =
              weightRefs.current.get(
                last.id,
              );


            if (!parentWeight) {
              return;
            }


            target =
              parentWeight
                .getBottomAttachmentPosition();
          }


          const weightTop =
            weight
              .getTopAttachmentPosition();


          const dx =
            weightTop.x -
            target.x;


          const dy =
            weightTop.y -
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


          //
          // Align the weight's TOP-center
          // attachment point with the
          // existing chain endpoint.
          //

          weight.x =
            target.x -
            weight.getWeightSize() /
              2;


          weight.y =
            target.y;


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


              //
              // A loose spring is moved
              // normally.
              //

              if (
                !isSpringAttached(
                  spring.id,
                )
              ) {

                return true;
              }


              //
              // Attached springs are not
              // direct stretch handles.
              //

              return false;
            },
          );


          spring.setOnDragEnd(
            () => {

              tryAttachSpring(
                spring,
              );


              physics.start();
            },
          );


          spring.setOnRightDragStart(
            () => {

              physics.stop();


              if (
                !isSpringAttached(
                  spring.id,
                )
              ) {

                return false;
              }


              const detached =
                physics.disconnectChild(
                  "spring",
                  spring.id,
                );


              if (detached) {

                physics.start();
              }


              return detached;
            },
          );


          spring.setOnRightDragEnd(
            () => {

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


              return false;
            },
          );


          weight.setOnMoveDragEnd(
            () => {

              tryAttachWeight(
                weight,
              );


              physics.start();
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

                mouse.y /
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


          weight.setOnRightDragStart(
            () => {

              physics.stop();


              if (
                !isWeightAttached(
                  weight.id,
                )
              ) {

                return false;
              }


              const detached =
                physics.disconnectChild(
                  "weight",
                  weight.id,
                );


              if (detached) {

                weight.setDragMode(
                  "move",
                );


                physics.start();
              }


              return detached;
            },
          );


          weight.setOnRightDragEnd(
            () => {

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
            },
          );
        };



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
                y: 65,
              },

              length:
                0.4,

              k,

              pixelsPerMeter:
                PIXELS_PER_METER,

              orientation:
                "vertical",
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

                "vertical",
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
        380,
      );

      createSpringFactory(
        30,
        520,
      );

      createSpringFactory(
        40,
        660,
      );

      // =================================================
      // 1 kg weight factory
      // =================================================


      const createWeightFactory =
        () => {

          const weight =
            new Weight2D({

              id:
                `weight${nextWeightIdRef.current++}`,

                position: {
                x: 800,
                y: 65,
              },

              mass:
                0.2,

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

      const physics =
        physicsRef.current;


      const timer =
        timerRef.current;


      const deltaTime =
        ticker.deltaMS /
        1000;


      timer?.update(
        deltaTime,
      );


      if (
        !physics ||
        !physics.isRunning()
      ) {

        return;
      }


      const pointer =
        pointerPositionRef.current;


      for (
        const [
          id,
          weight,
        ] of
        weightRefs.current
      ) {

        let dampingActive =
          false;


        if (pointer) {

          const size =
            weight.getWeightSize();


          dampingActive =
            pointer.x >=
              weight.x &&
            pointer.x <=
              weight.x + size &&
            pointer.y >=
              weight.y &&
            pointer.y <=
              weight.y + size;
        }


        physics.setWeightDampingActive(
          id,
          dampingActive,
        );
      }


      physics.move(
        deltaTime,
      );


      renderChain();
    },
  );


  return null;
}



export default function VerticalHooksLaw() {

  return (
    <div
      onContextMenu={
        event =>
          event.preventDefault()
      }
    >
      <Application
        width={1000}
        height={580}
        backgroundColor={0xf5f5f5}
      >
        <VerticalHooksLawContents />
      </Application>
    </div>
  );
}
