import {
  Application,
  useTick,
} from "@pixi/react";

import {
  useRef,
} from "react";

import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
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


const PIXELS_PER_METER = 720;
const BEAM_LENGTH_METERS = 1.0;
const MAX_ANGLE = Math.PI / 18;
const BLOCK_SIZE = 45;

const FACTORY_POSITION = {
  x: 50,
  y: 115,
};


class TorqueBeam extends Container {

  private readonly beamGraphic: Graphics;

  private readonly centerMarkGraphic: Graphics;

  private beamAngleRadians = 0;

  private angularVelocity = 0;

  private netTorque = 0;


  constructor() {

    super();

    this.position.set(
      500,
      240,
    );


    const supportGraphic =
      new Graphics()
        .moveTo(
          -55,
          105,
        )
        .lineTo(
          55,
          105,
        )
        .lineTo(
          0,
          8,
        )
        .closePath()
        .fill(
          0x777777,
        )
        .stroke({
          width: 2,
          color: 0x444444,
        });


    this.addChild(
      supportGraphic,
    );


    const halfLengthPixels =
      BEAM_LENGTH_METERS *
      PIXELS_PER_METER /
      2;


    this.beamGraphic =
      new Graphics()
        .roundRect(
          -halfLengthPixels,
          -9,
          halfLengthPixels * 2,
          18,
          5,
        )
        .fill(
          0xc49a6c,
        )
        .stroke({
          width: 2,
          color: 0x5b4633,
        });


    this.addChild(
      this.beamGraphic,
    );


    const pivotGraphic =
      new Graphics()
        .circle(
          0,
          0,
          12,
        )
        .fill(
          0xdddddd,
        )
        .stroke({
          width: 3,
          color: 0x333333,
        });


    this.addChild(
      pivotGraphic,
    );


    this.centerMarkGraphic =
      new Graphics()
        .moveTo(
          0,
          -8,
        )
        .lineTo(
          0,
          8,
        )
        .stroke({
          width: 3,
          color: 0xff0000,
        });


    this.addChild(
      this.centerMarkGraphic,
    );


  }


  public setNetTorque(
    value: number,
  ) {

    this.netTorque =
      Math.abs(
        value,
      ) < 0.000001
        ? 0
        : value;
  }


  public update(
    deltaTimeSeconds: number,
  ) {

    const targetAngle =
      this.netTorque === 0
        ? 0
        : Math.sign(
            this.netTorque,
          ) *
          MAX_ANGLE;


    const error =
      targetAngle -
      this.beamAngleRadians;


    if (
      Math.abs(
        error,
      ) < 0.00001
    ) {

      this.beamAngleRadians =
        targetAngle;

      this.angularVelocity =
        0;

      this.beamGraphic.rotation =
        this.beamAngleRadians;

      this.centerMarkGraphic.rotation =
        this.beamAngleRadians;

      return;
    }


    const direction =
      Math.sign(
        error,
      );


    const accelerationMagnitude =
      0.30 +
      0.08 *
      Math.abs(
        this.netTorque,
      );


    if (
      this.angularVelocity !== 0 &&
      Math.sign(
        this.angularVelocity,
      ) !==
        direction
    ) {

      this.angularVelocity =
        0;
    }


    this.angularVelocity +=
      direction *
      accelerationMagnitude *
      deltaTimeSeconds;


    const maximumSpeed =
      0.50;


    this.angularVelocity =
      Math.max(
        -maximumSpeed,
        Math.min(
          maximumSpeed,
          this.angularVelocity,
        ),
      );


    const proposedAngle =
      this.beamAngleRadians +
      this.angularVelocity *
      deltaTimeSeconds;


    const reachedTarget =
      (
        direction > 0 &&
        proposedAngle >=
          targetAngle
      ) ||
      (
        direction < 0 &&
        proposedAngle <=
          targetAngle
      );


    if (reachedTarget) {

      this.beamAngleRadians =
        targetAngle;

      this.angularVelocity =
        0;
    } else {

      this.beamAngleRadians =
        proposedAngle;
    }


    this.beamGraphic.rotation =
      this.beamAngleRadians;

    this.centerMarkGraphic.rotation =
      this.beamAngleRadians;
  }


  public getPointAt(
    positionMeters: number,
  ) {

    const distancePixels =
      positionMeters *
      PIXELS_PER_METER;


    return new Point(
      this.x +
        distancePixels *
        Math.cos(
          this.beamAngleRadians,
        ),

      this.y +
        distancePixels *
        Math.sin(
          this.beamAngleRadians,
        ),
    );
  }


  public getPositionFromPoint(
    point: Point,
  ) {

    const dx =
      point.x -
      this.x;

    const dy =
      point.y -
      this.y;


    return (
      (
        dx *
          Math.cos(
            this.beamAngleRadians,
          ) +
        dy *
          Math.sin(
            this.beamAngleRadians,
          )
      ) /
      PIXELS_PER_METER
    );
  }


  public getDistanceFromBeam(
    point: Point,
  ) {

    const beamPosition =
      this.getPositionFromPoint(
        point,
      );


    const beamPoint =
      this.getPointAt(
        beamPosition,
      );


    return Math.hypot(
      point.x -
        beamPoint.x,

      point.y -
        beamPoint.y,
    );
  }


  public clampBlockPosition(
    positionMeters: number,
  ) {

    const halfBlockMeters =
      BLOCK_SIZE /
      2 /
      PIXELS_PER_METER;


    const limit =
      BEAM_LENGTH_METERS /
      2 -
      halfBlockMeters;


    return Math.max(
      -limit,
      Math.min(
        limit,
        positionMeters,
      ),
    );
  }


  public get angleRadians() {

    return this.beamAngleRadians;
  }
}


class BalanceBlock extends Container {

  public mass: number;

  private readonly labelText: Text;

  private dragging = false;

  private dragOffset =
    new Point();

  private onDragStart?: (
    point: Point,
  ) => void;

  private onDragMove?: (
    point: Point,
  ) => void;

  private onDragEnd?: (
    point: Point,
  ) => void;


  constructor(
    mass: number,
    label: string,
    position: {
      x: number;
      y: number;
    },
  ) {

    super();


    this.mass =
      mass;


    this.position.set(
      position.x,
      position.y,
    );


    const bodyGraphic =
      new Graphics()
        .roundRect(
          -BLOCK_SIZE / 2,
          -BLOCK_SIZE / 2,
          BLOCK_SIZE,
          BLOCK_SIZE,
          5,
        )
        .fill(
          0x7da7d9,
        )
        .stroke({
          width: 2,
          color: 0x2f4f70,
        });


    this.addChild(
      bodyGraphic,
    );


    this.labelText =
      new Text({
        text: label,

        style: {
          fontSize: 15,
          fill: 0x000000,
        },
      });


    this.labelText.anchor.set(
      0.5,
    );


    this.addChild(
      this.labelText,
    );


    this.eventMode =
      "static";

    this.cursor =
      "grab";


    this.on(
      "pointerdown",
      this.handlePointerDown,
    );

    this.on(
      "globalpointermove",
      this.handlePointerMove,
    );

    this.on(
      "pointerup",
      this.handlePointerUp,
    );

    this.on(
      "pointerupoutside",
      this.handlePointerUp,
    );
  }


  public setMassAndLabel(
    mass: number,
    label: string,
  ) {

    this.mass =
      mass;

    this.labelText.text =
      label;
  }


  public setDragHandlers(
    onDragStart:
      (
        point: Point,
      ) => void,

    onDragMove:
      (
        point: Point,
      ) => void,

    onDragEnd:
      (
        point: Point,
      ) => void,
  ) {

    this.onDragStart =
      onDragStart;

    this.onDragMove =
      onDragMove;

    this.onDragEnd =
      onDragEnd;
  }


  private getRequestedCenter(
    event:
      FederatedPointerEvent,
  ) {

    return new Point(
      event.global.x -
        this.dragOffset.x,

      event.global.y -
        this.dragOffset.y,
    );
  }


  private handlePointerDown = (
    event:
      FederatedPointerEvent,
  ) => {

    if (
      event.button !== 0
    ) {

      return;
    }


    this.dragging =
      true;

    this.cursor =
      "grabbing";


    this.dragOffset.set(
      event.global.x -
        this.x,

      event.global.y -
        this.y,
    );


    this.onDragStart?.(
      this.getRequestedCenter(
        event,
      ),
    );
  };


  private handlePointerMove = (
    event:
      FederatedPointerEvent,
  ) => {

    if (!this.dragging) {
      return;
    }


    this.onDragMove?.(
      this.getRequestedCenter(
        event,
      ),
    );
  };


  private handlePointerUp = (
    event:
      FederatedPointerEvent,
  ) => {

    if (!this.dragging) {
      return;
    }


    this.dragging =
      false;

    this.cursor =
      "grab";


    this.onDragEnd?.(
      this.getRequestedCenter(
        event,
      ),
    );
  };
}


interface PlacedBlock {

  visual:
    BalanceBlock;

  attached:
    boolean;

  beamPosition:
    number;

  stackLevel:
    number;
}


function TorqueBalanceFinalLayoutContents() {

  const beamRef =
    useRef<
      TorqueBeam | null
    >(
      null,
    );


  const placedBlocksRef =
    useRef<
      PlacedBlock[]
    >(
      [],
    );


  useExperiment2D(
    (
      experiment:
        Experiment2D,
    ) => {

      const beam =
        new TorqueBeam();


      beamRef.current =
        beam;


      experiment.add(
        beam,
      );


      let selectedMass =
        1;

      let randomMode:
        0 | 1 | 2 =
        0;

      let factoryBlock:
        BalanceBlock | null =
        null;


      const randomMassR1 =
        Math.floor(
          Math.random() *
          5,
        ) +
        1;


      let randomMassR2 =
        Math.floor(
          Math.random() *
          5,
        ) +
        1;


      while (
        randomMassR2 ===
        randomMassR1
      ) {

        randomMassR2 =
          Math.floor(
            Math.random() *
            5,
          ) +
          1;
      }


      const getCurrentMass =
        () => {

          if (
            randomMode === 1
          ) {

            return randomMassR1;
          }


          if (
            randomMode === 2
          ) {

            return randomMassR2;
          }


          return selectedMass;
        };


      const getCurrentLabel =
        () => {

          if (
            randomMode === 1
          ) {

            return "x";
          }


          if (
            randomMode === 2
          ) {

            return "y";
          }


          return `${selectedMass} kg`;
        };


      const recomputeTorque =
        () => {

          let netTorque =
            0;


          for (
            const block
            of placedBlocksRef.current
          ) {

            if (
              !block.attached
            ) {

              continue;
            }


            netTorque +=
              block.visual.mass *
              block.beamPosition;
          }


          beam.setNetTorque(
            netTorque,
          );
        };


      const positionAttachedBlock =
        (
          block:
            PlacedBlock,
        ) => {

          const beamPoint =
            beam.getPointAt(
              block.beamPosition,
            );


          const angle =
            beam.angleRadians;


          /*
           * Level 0 sits directly on the beam.
           * Each higher level is exactly one
           * block height above the previous one.
           */
          const normalOffset =
            BLOCK_SIZE / 2 +
            block.stackLevel *
            BLOCK_SIZE;


          block.visual.position.set(
            beamPoint.x +
              Math.sin(
                angle,
              ) *
              normalOffset,

            beamPoint.y -
              Math.cos(
                angle,
              ) *
              normalOffset,
          );


          block.visual.rotation =
            angle;
        };


      const compactColumn =
        (
          beamPosition:
            number,
        ) => {

          const column =
            placedBlocksRef.current
              .filter(
                candidate =>
                  candidate.attached &&
                  Math.abs(
                    candidate.beamPosition -
                    beamPosition,
                  ) <
                    0.000001,
              )
              .sort(
                (
                  a,
                  b,
                ) =>
                  a.stackLevel -
                  b.stackLevel,
              );


          column.forEach(
            (
              candidate,
              index,
            ) => {

              candidate.stackLevel =
                index;


              positionAttachedBlock(
                candidate,
              );
            },
          );
        };


      const getSignedNormalOffset =
        (
          point:
            Point,
        ) => {

          const beamPosition =
            beam.getPositionFromPoint(
              point,
            );


          const beamPoint =
            beam.getPointAt(
              beamPosition,
            );


          const angle =
            beam.angleRadians;


          const dx =
            point.x -
            beamPoint.x;

          const dy =
            point.y -
            beamPoint.y;


          /*
           * Positive means "above" the beam.
           */
          return (
            dx *
              Math.sin(
                angle,
              ) -
            dy *
              Math.cos(
                angle,
              )
          );
        };


      const findPlacement =
        (
          point:
            Point,

          blockBeingPlaced:
            PlacedBlock,
        ):
        {
          beamPosition:
            number;

          stackLevel:
            number;
        } | null => {

          const rawBeamPosition =
            beam.getPositionFromPoint(
              point,
            );


          const maxCenterMeters =
            BEAM_LENGTH_METERS /
              2 -
            BLOCK_SIZE /
              2 /
              PIXELS_PER_METER;


          const maxCenterCentimeters =
            Math.floor(
              maxCenterMeters *
              100,
            );


          const requestedCentimeters =
            Math.max(
              -maxCenterCentimeters,
              Math.min(
                maxCenterCentimeters,
                Math.round(
                  rawBeamPosition *
                  100,
                ),
              ),
            );


          const signedNormalOffset =
            getSignedNormalOffset(
              point,
            );


          /*
           * Existing blocks, excluding the one
           * currently being dropped.
           */
          const attachedBlocks =
            placedBlocksRef.current.filter(
              candidate =>
                candidate !==
                  blockBeingPlaced &&
                candidate.attached,
            );


          /*
           * If the block is being dropped above
           * an existing column, stack it on top.
           */
          let nearestColumnPosition:
            number | null =
            null;

          let nearestColumnDistance =
            Number.POSITIVE_INFINITY;


          for (
            const candidate
            of attachedBlocks
          ) {

            const candidateCentimeters =
              Math.round(
                candidate.beamPosition *
                100,
              );


            const distanceCentimeters =
              Math.abs(
                candidateCentimeters -
                requestedCentimeters,
              );


            if (
              distanceCentimeters <
              nearestColumnDistance
            ) {

              nearestColumnDistance =
                distanceCentimeters;

              nearestColumnPosition =
                candidate.beamPosition;
            }
          }


          if (
            nearestColumnPosition !==
              null &&
            nearestColumnDistance <= 7 &&
            signedNormalOffset >
              BLOCK_SIZE
          ) {

            const columnBlocks =
              attachedBlocks.filter(
                candidate =>
                  Math.abs(
                    candidate.beamPosition -
                    nearestColumnPosition!,
                  ) <
                    0.000001,
              );


            return {
              beamPosition:
                nearestColumnPosition,

              stackLevel:
                columnBlocks.length,
            };
          }


          /*
           * Otherwise place on the beam itself.
           *
           * Search centimeter positions outward
           * from the requested mark until we find
           * the nearest level-0 slot that does
           * not overlap another level-0 block.
           */
          const minimumCenterSpacingCm =
            Math.ceil(
              BLOCK_SIZE /
              PIXELS_PER_METER *
              100,
            );


          const isBasePositionFree =
            (
              centimeters:
                number,
            ) => {

              return !attachedBlocks.some(
                candidate =>
                  candidate.stackLevel ===
                    0 &&
                  Math.abs(
                    Math.round(
                      candidate.beamPosition *
                      100,
                    ) -
                    centimeters,
                  ) <
                    minimumCenterSpacingCm,
              );
            };


          for (
            let offset = 0;
            offset <=
              2 *
              maxCenterCentimeters;
            offset++
          ) {

            const candidates =
              offset === 0
                ? [
                    requestedCentimeters,
                  ]
                : [
                    requestedCentimeters +
                      offset,

                    requestedCentimeters -
                      offset,
                  ];


            for (
              const centimeters
              of candidates
            ) {

              if (
                centimeters <
                  -maxCenterCentimeters ||
                centimeters >
                  maxCenterCentimeters
              ) {

                continue;
              }


              if (
                isBasePositionFree(
                  centimeters,
                )
              ) {

                return {
                  beamPosition:
                    centimeters /
                    100,

                  stackLevel:
                    0,
                };
              }
            }
          }


          return null;
        };


      let createFactoryBlock:
        () => void;


      const configureDrag =
        (
          block:
            BalanceBlock,

          startsAsFactory:
            boolean,
        ) => {

          let isFactory =
            startsAsFactory;

          let placedBlock:
            PlacedBlock | null =
            null;


          block.setDragHandlers(

            () => {

              if (isFactory) {

                isFactory =
                  false;


                placedBlock = {
                  visual:
                    block,

                  attached:
                    false,

                  beamPosition:
                    0,

                  stackLevel:
                    0,
                };


                placedBlocksRef.current.push(
                  placedBlock,
                );


                factoryBlock =
                  null;


                createFactoryBlock();

                return;
              }


              if (
                placedBlock
              ) {

                const oldBeamPosition =
                  placedBlock.beamPosition;


                placedBlock.attached =
                  false;


                block.rotation =
                  0;


                compactColumn(
                  oldBeamPosition,
                );


                recomputeTorque();
              }
            },


            (
              point:
                Point,
            ) => {

              block.position.set(
                point.x,
                point.y,
              );

              block.rotation =
                0;
            },


            (
              point:
                Point,
            ) => {

              if (
                !placedBlock
              ) {

                return;
              }


              const rawBeamPosition =
                beam.getPositionFromPoint(
                  point,
                );


              const insideLength =
                Math.abs(
                  rawBeamPosition,
                ) <=
                BEAM_LENGTH_METERS /
                2;


              if (
                !insideLength
              ) {

                placedBlock.attached =
                  false;


                block.position.set(
                  point.x,
                  point.y,
                );

                block.rotation =
                  0;


                recomputeTorque();

                return;
              }


              const placement =
                findPlacement(
                  point,
                  placedBlock,
                );


              if (
                placement === null
              ) {

                placedBlock.attached =
                  false;


                block.position.set(
                  point.x,
                  point.y,
                );

                block.rotation =
                  0;


                recomputeTorque();

                return;
              }


              /*
               * Compute the exact center of the
               * snapped destination.  The block
               * only attaches if it was actually
               * released near that location.
               *
               * This permits arbitrarily tall
               * stacks, but prevents a detached
               * block from being "magnetically"
               * pulled back from far away.
               */
              const placementBeamPoint =
                beam.getPointAt(
                  placement.beamPosition,
                );


              const placementAngle =
                beam.angleRadians;


              const placementNormalOffset =
                BLOCK_SIZE / 2 +
                placement.stackLevel *
                BLOCK_SIZE;


              const placementX =
                placementBeamPoint.x +
                Math.sin(
                  placementAngle,
                ) *
                placementNormalOffset;


              const placementY =
                placementBeamPoint.y -
                Math.cos(
                  placementAngle,
                ) *
                placementNormalOffset;


              const distanceToPlacement =
                Math.hypot(
                  point.x -
                    placementX,
                  point.y -
                    placementY,
                );


              const SNAP_DISTANCE_PIXELS =
                40;


              if (
                distanceToPlacement >
                SNAP_DISTANCE_PIXELS
              ) {

                placedBlock.attached =
                  false;


                block.position.set(
                  point.x,
                  point.y,
                );

                block.rotation =
                  0;


                recomputeTorque();

                return;
              }


              placedBlock.attached =
                true;


              /*
               * findPlacement() rounds the beam
               * coordinate to an integer number
               * of centimeters, so torque uses
               * the same exact cm-aligned value
               * seen by the student.
               */
              placedBlock.beamPosition =
                placement.beamPosition;


              placedBlock.stackLevel =
                placement.stackLevel;


              positionAttachedBlock(
                placedBlock,
              );


              recomputeTorque();
            },
          );
        };


      createFactoryBlock =
        () => {

          const block =
            new BalanceBlock(
              getCurrentMass(),
              getCurrentLabel(),
              FACTORY_POSITION,
            );


          factoryBlock =
            block;


          configureDrag(
            block,
            true,
          );


          experiment.add(
            block,
          );
        };


      const massControl =
        new ValueControl({
          label:
            "Mass, kg",

          min:
            1,

          max:
            5,

          step:
            1,

          value:
            1,

          showRandom:
            true,

          showUnlimitedSupply:
            false,

          position: {
            x: 35,
            y: 20,
          },

          onValueChanged:
            (
              value,
              isRandom,
            ) => {

              if (isRandom) {

                randomMode =
                  value === 0
                    ? 1
                    : 2;
              } else {

                randomMode =
                  0;

                selectedMass =
                  value;
              }


              factoryBlock
                ?.setMassAndLabel(
                  getCurrentMass(),
                  getCurrentLabel(),
                );
            },
        });


      experiment.add(
        massControl,
      );


      createFactoryBlock();


      /*
       * Independent measuring tool.
       *
       * The beam itself intentionally has no
       * tick marks. Students use the ruler
       * when they want to measure lever arm.
       */
      const ruler =
        new Ruler2D(
          1,
          {
            x: 140,
            y: 360,
          },
          PIXELS_PER_METER,
          "horizontal",
        );


      experiment.add(
        ruler,
      );
    },
  );


  useTick(
    ticker => {

      const beam =
        beamRef.current;


      if (!beam) {
        return;
      }


      beam.update(
        ticker.deltaMS /
        1000,
      );


      for (
        const block
        of placedBlocksRef.current
      ) {

        if (
          !block.attached
        ) {

          continue;
        }


        const beamPoint =
          beam.getPointAt(
            block.beamPosition,
          );


        const angle =
          beam.angleRadians;

        const normalOffset =
          BLOCK_SIZE / 2 +
          block.stackLevel *
          BLOCK_SIZE;


        block.visual.position.set(
          beamPoint.x +
            Math.sin(
              angle,
            ) *
            normalOffset,

          beamPoint.y -
            Math.cos(
              angle,
            ) *
            normalOffset,
        );


        block.visual.rotation =
          angle;
      }
    },
  );


  return null;
}


export default function TorqueBalanceFinalLayout() {

  return (
    <Application
      width={1000}
      height={600}
      backgroundColor={0xffffff}
      antialias
    >
      <TorqueBalanceFinalLayoutContents />
    </Application>
  );
}
