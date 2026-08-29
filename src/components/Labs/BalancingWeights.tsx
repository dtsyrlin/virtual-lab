import {
  Application,
  useTick,
} from "@pixi/react";

import {
  useRef,
} from "react";

import {
  Experiment2D,
  useExperiment2D,
} from "./Experiment2D";

import {
  Balance2D,
} from "../Objects/Balance2D";

import {
  Weight2D,
} from "../Objects/Weight2D";

import {
  SizeControl,
} from "../Objects/SizeControl";

import {
  BalancingWeightsPhysics,
} from "../PhysicalSystems/BalancingWeightsPhysics";


type Side =
  | "left"
  | "right";


type WeightFactoryConfig = {

  controlPosition: {
    x: number;
    y: number;
  };

  weightPosition: {
    x: number;
    y: number;
  };

  initialMass: number;

  minMass: number;
  maxMass: number;
};


const SNAP_DISTANCE_Y =
  100;


const WEIGHT_SIZE =
  40;


const UNKNOWN_LABELS = [
  "w",
  "x",
  "y",
  "z",
];


function randomInteger(
  min: number,
  max: number
): number {

  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
}



function BalancingWeightsContents() {

  const nextWeightIdRef =
    useRef(1);


  const physicsRef =
    useRef<
      BalancingWeightsPhysics | null
    >(
      null
    );


  const balanceRef =
    useRef<
      Balance2D | null
    >(
      null
    );


  const leftStackRef =
    useRef<
      Weight2D[]
    >(
      []
    );


  const rightStackRef =
    useRef<
      Weight2D[]
    >(
      []
    );


  useExperiment2D(
    (
      experiment:
        Experiment2D,
    ) => {

      const physics =
        new BalancingWeightsPhysics();


      physicsRef.current =
        physics;


      const balance =
        new Balance2D({

          position: {
            x: 620,
            y: 360,
          },

          width:
            460,

          height:
            240,
        });


      balanceRef.current =
        balance;


      experiment.add(
        balance,
      );


      const factoryConfigs:
        WeightFactoryConfig[] = [

          {
            controlPosition: {
              x: 20,
              y: 20,
            },

            weightPosition: {
              x: 210,
              y: 78,
            },

            initialMass:
              1,

            minMass:
              1,

            maxMass:
              13,
          },

          {
            controlPosition: {
              x: 20,
              y: 150,
            },

            weightPosition: {
              x: 210,
              y: 208,
            },

            initialMass:
              3,

            minMass:
              1,

            maxMass:
              13,
          },

          {
            controlPosition: {
              x: 20,
              y: 280,
            },

            weightPosition: {
              x: 210,
              y: 338,
            },

            initialMass:
              5,

            minMass:
              1,

            maxMass:
              13,
          },

          {
            controlPosition: {
              x: 20,
              y: 410,
            },

            weightPosition: {
              x: 210,
              y: 468,
            },

            initialMass:
              14,

            minMass:
              14,

            maxMass:
              27,
          },
        ];


      const selectedMasses =
        factoryConfigs.map(
          config =>
            config.initialMass,
        );


      const factoryIsRandom = [
        false,
        false,
        false,
        false,
      ];


      const factoryLabels:
        Array<
          string | null
        > = [
          null,
          null,
          null,
          null,
        ];


      let unknownLabelOffset =
        0;


      const factoryWeights:
        Array<
          Weight2D | null
        > =
        factoryConfigs.map(
          () => null,
        );


      const generatedWeights:
        Weight2D[] = [];


      const weightSides =
        new Map<
          string,
          Side
        >();


      const getStack =
        (
          side:
            Side,
        ) => {

          return side === "left"
            ? leftStackRef.current
            : rightStackRef.current;
        };


      const updatePhysics =
        () => {

          const leftMass =
            leftStackRef.current.reduce(
              (
                sum,
                weight
              ) =>
                sum +
                weight.mass,
              0
            );


          const rightMass =
            rightStackRef.current.reduce(
              (
                sum,
                weight
              ) =>
                sum +
                weight.mass,
              0
            );


          physics.updateMasses(
            leftMass,
            rightMass
          );
        };


      const positionStack =
        (
          side:
            Side,
        ) => {

          const stack =
            getStack(
              side
            );


          const platform =
            side === "left"
              ? balance
                  .getLeftPlatformTop()
              : balance
                  .getRightPlatformTop();


          const platformWidth =
            balance
              .getPlatformWidth();


          const columns =
            Math.max(
              1,
              Math.floor(
                platformWidth /
                WEIGHT_SIZE
              )
            );


          const usedWidth =
            columns *
            WEIGHT_SIZE;


          const startX =
            platform.x -
            usedWidth / 2;


          for (
            let index = 0;
            index < stack.length;
            index++
          ) {

            const weight =
              stack[
                index
              ];


            const column =
              index %
              columns;


            const row =
              Math.floor(
                index /
                columns
              );


            weight.setPosition(

              startX +
                column *
                WEIGHT_SIZE,

              platform.y -
                (
                  row +
                  1
                ) *
                WEIGHT_SIZE,
            );
          }
        };

      const removeFromStack =
        (
          weight:
            Weight2D,
        ) => {

          const side =
            weightSides.get(
              weight.id,
            );


          if (!side) {
            return;
          }


          const stack =
            getStack(
              side
            );


          const index =
            stack.indexOf(
              weight,
            );


          if (
            index >= 0
          ) {

            stack.splice(
              index,
              1,
            );
          }


          weightSides.delete(
            weight.id,
          );


          positionStack(
            side
          );


          updatePhysics();
        };


      const tryPlaceWeight =
        (
          weight:
            Weight2D,
        ) => {

          const size =
            weight
              .getWeightSize();


          const centerX =
            weight.x +
            size / 2;


          const bottomY =
            weight.y +
            size;


          const platformWidth =
            balance
              .getPlatformWidth();


          const trySide =
            (
              side:
                Side,
            ): boolean => {

              const stack =
                getStack(
                  side
                );


              const platform =
                side === "left"
                  ? balance
                      .getLeftPlatformTop()
                  : balance
                      .getRightPlatformTop();


              if (
                centerX <
                  platform.x -
                    platformWidth / 2 ||
                centerX >
                  platform.x +
                    platformWidth / 2
              ) {

                return false;
              }


              const columns =
                Math.max(
                  1,
                  Math.floor(
                    platformWidth /
                    WEIGHT_SIZE
                  )
                );


              const nextRow =
                Math.floor(
                  stack.length /
                  columns
                );


              const targetTopY =
                platform.y -
                nextRow *
                WEIGHT_SIZE;


              if (
                Math.abs(
                  bottomY -
                  targetTopY,
                ) >
                SNAP_DISTANCE_Y
              ) {

                return false;
              }


              stack.push(
                weight
              );


              weightSides.set(
                weight.id,
                side
              );


              positionStack(
                side
              );


              updatePhysics();


              return true;
            };


          if (
            trySide(
              "left"
            )
          ) {

            return;
          }


          trySide(
            "right"
          );
        };


      const wireGeneratedWeight =
        (
          weight:
            Weight2D,
        ) => {

          weight.setOnMoveDragStart(
            () => {

              removeFromStack(
                weight
              );


              return true;
            },
          );


          weight.setOnMoveDragEnd(
            () => {

              tryPlaceWeight(
                weight
              );
            },
          );
        };


      const clearGeneratedWeights =
        () => {

          for (
            const weight
            of generatedWeights
          ) {

            experiment.remove(
              weight
            );

            weight.destroy();
          }


          generatedWeights.length =
            0;


          leftStackRef.current.length =
            0;

          rightStackRef.current.length =
            0;


          weightSides.clear();


          physics.reset();


          balance.setTilt(
            0
          );
        };


      const refreshUnknownLabels =
        () => {

          let unknownIndex =
            0;


          for (
            let index = 0;
            index < factoryWeights.length;
            index++
          ) {

            if (
              !factoryIsRandom[
                index
              ]
            ) {

              factoryLabels[
                index
              ] =
                null;

              continue;
            }


            const label =
              UNKNOWN_LABELS[
                (
                  unknownLabelOffset +
                  unknownIndex
                ) %
                UNKNOWN_LABELS.length
              ];


            factoryLabels[
              index
            ] =
              label;


            factoryWeights[
              index
            ]?.setLabel(
              label
            );


            unknownIndex++;
          }
        };


      const createWeightFactory =
        (
          factoryIndex:
            number,
        ) => {

          const config =
            factoryConfigs[
              factoryIndex
            ];


          const weight =
            new Weight2D({

              id:
                `weight${nextWeightIdRef.current++}`,

              position: {
                x:
                  config
                    .weightPosition
                    .x,

                y:
                  config
                    .weightPosition
                    .y,
              },

              mass:
                selectedMasses[
                  factoryIndex
                ],

              size:
                WEIGHT_SIZE,
            });


          const factoryLabel =
            factoryLabels[
              factoryIndex
            ];


          if (
            factoryLabel !==
            null
          ) {

            weight.setLabel(
              factoryLabel
            );
          }


          experiment.add(
            weight
          );


          factoryWeights[
            factoryIndex
          ] =
            weight;


          weight.setDragMode(
            "move"
          );


          weight.setOnMoveDragStart(
            () => {

              factoryWeights[
                factoryIndex
              ] =
                null;


              generatedWeights.push(
                weight
              );


              wireGeneratedWeight(
                weight
              );


              createWeightFactory(
                factoryIndex
              );


              return true;
            },
          );
        };


      factoryConfigs.forEach(
        (
          config,
          index,
        ) => {

          const control =
            new SizeControl({

              showLabel:
                false,

              min:
                config.minMass,

              max:
                config.maxMass,

              value:
                config.initialMass,

              showUnlimitedSupply:
                false,

              position:
                config.controlPosition,

              onValueChanged:
                (
                  value,
                  isRandom
                ) => {

                  clearGeneratedWeights();


                  if (
                    isRandom
                  ) {

                    factoryIsRandom[
                      index
                    ] =
                      true;


                    selectedMasses[
                      index
                    ] =
                      randomInteger(
                        config.minMass,
                        config.maxMass
                      );


                    factoryWeights[
                      index
                    ]?.setMass(
                      selectedMasses[
                        index
                      ]
                    );


                    unknownLabelOffset =
                      (
                        unknownLabelOffset +
                        1
                      ) %
                      UNKNOWN_LABELS.length;


                    refreshUnknownLabels();


                    return;
                  }


                  factoryIsRandom[
                    index
                  ] =
                    false;


                  selectedMasses[
                    index
                  ] =
                    value;


                  factoryLabels[
                    index
                  ] =
                    null;


                  factoryWeights[
                    index
                  ]?.setMass(
                    value
                  );


                  refreshUnknownLabels();
                },
            });


          experiment.add(
            control
          );
        },
      );


      createWeightFactory(
        0
      );

      createWeightFactory(
        1
      );

      createWeightFactory(
        2
      );

      createWeightFactory(
        3
      );
    },
  );


  useTick(
    ticker => {

      const physics =
        physicsRef.current;


      const balance =
        balanceRef.current;


      if (
        !physics ||
        !balance
      ) {

        return;
      }


      const deltaTime =
        ticker.deltaMS /
        1000;


      physics.move(
        deltaTime
      );


      balance.setTilt(
        physics.getTilt()
      );


      const platformWidth =
        balance
          .getPlatformWidth();


      const columns =
        Math.max(
          1,
          Math.floor(
            platformWidth /
            WEIGHT_SIZE
          )
        );


      const positionStack =
        (
          side:
            Side,
          stack:
            Weight2D[]
        ) => {

          const platform =
            side === "left"
              ? balance
                  .getLeftPlatformTop()
              : balance
                  .getRightPlatformTop();


          const usedWidth =
            columns *
            WEIGHT_SIZE;


          const startX =
            platform.x -
            usedWidth / 2;


          for (
            let index = 0;
            index < stack.length;
            index++
          ) {

            const column =
              index %
              columns;


            const row =
              Math.floor(
                index /
                columns
              );


            stack[
              index
            ].setPosition(

              startX +
                column *
                WEIGHT_SIZE,

              platform.y -
                (
                  row +
                  1
                ) *
                WEIGHT_SIZE,
            );
          }
        };


      positionStack(
        "left",
        leftStackRef.current
      );


      positionStack(
        "right",
        rightStackRef.current
      );
    },
  );


  return null;
}



export default function BalancingWeights() {

  return (
    <Application
      resizeTo={window}
      backgroundColor={0xe8edf2}
      antialias
    >
      <BalancingWeightsContents />
    </Application>
  );
}
