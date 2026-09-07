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
  Pendulum2D,
} from "../Objects/Pendulum2D";

import {
  Timer2D,
} from "../Objects/Timer2D";

import {
  GravitySelector2D,
} from "../Objects/GravitySelector2D";

import {
  Ruler2D,
} from "../Objects/Ruler2D";

import {
  Protractor2D,
} from "../Objects/Protractor2D";

import {
  PendulumPhysics,
} from "../PhysicalSystems/PendulumPhysics";


const PIXELS_PER_METER =
  420;

const INITIAL_LENGTH =
  0.65;


function PendulumContents() {
  const pendulumRef =
    useRef<
      Pendulum2D | null
    >(null);

  const physicsRef =
    useRef<
      PendulumPhysics | null
    >(null);

  const timerRef =
    useRef<
      Timer2D | null
    >(null);

  const gravityRef =
    useRef(
      9.81
    );


  useExperiment2D(
    (
      experiment:
        Experiment2D
    ) => {

      const timer =
        new Timer2D(
          760,
          90
        );

      timerRef.current =
        timer;

      experiment.add(
        timer
      );


      const gravitySelector =
        new GravitySelector2D(
          650,
          25
        );

      gravitySelector.setGravity(
        gravityRef.current
      );

      gravitySelector.onGravityChanged =
        (
          gravity
        ) => {

          gravityRef.current =
            gravity;

          physicsRef.current?.setGravity(
            gravity
          );
        };

      experiment.add(
        gravitySelector
      );


      const ruler =
        new Ruler2D(
          1,
          {
            x: 1015,
            y: 445,
          },
          PIXELS_PER_METER,
          "vertical"
        );

      experiment.add(
        ruler
      );


      const protractor =
        new Protractor2D(
          0.3,
          {
            x: 835,
            y: 385,
          },
          PIXELS_PER_METER
        );

      experiment.add(
        protractor
      );


      const pendulum =
        new Pendulum2D({
          position: {
            x: 80,
            y: 20,
          },

          pixelsPerMeter:
            PIXELS_PER_METER,

          minLength:
            0.30,

          maxLength:
            0.90,

          initialLength:
            INITIAL_LENGTH,

          supportWidth:
            520,

          supportThickness:
            14,

          bobRadius:
            24,
        });

      pendulumRef.current =
        pendulum;

      experiment.add(
        pendulum
      );


      const physics =
        new PendulumPhysics({
          lengthMeters:
            pendulum.lengthMeters,

          gravity:
            gravityRef.current,

          bobRadiusMeters:
            24 /
            PIXELS_PER_METER,
        });

      physicsRef.current =
        physics;


      pendulum.onLengthChanged =
        (
          lengthMeters
        ) => {

          /*
           * Dynamic length changes conserve angular momentum.
           */
          physics.setLength(
            lengthMeters,
            true
          );
        };


      pendulum.onBobReleased =
        (
          angleRadians
        ) => {

          physics.setLength(
            pendulum.lengthMeters,
            false
          );

          physics.setGravity(
            gravityRef.current
          );

          physics.releaseFromRest(
            angleRadians
          );
        };
    }
  );


  useTick(
    ticker => {

      const pendulum =
        pendulumRef.current;

      const physics =
        physicsRef.current;

      const timer =
        timerRef.current;


      const deltaTimeSeconds =
        ticker.deltaMS /
        1000;


      timer?.update(
        deltaTimeSeconds
      );


      if (
        !pendulum ||
        !physics ||
        pendulum.isBobDragging
      ) {
        return;
      }


      if (
        pendulum.isPointerWithinBobRadius
      ) {
        physics.applyDamping(
          deltaTimeSeconds
        );
      }


      const angle =
        physics.move(
          deltaTimeSeconds
        );


      pendulum.setAngle(
        angle
      );
    }
  );


  return null;
}


export default function Pendulum() {
  return (
    <Application
      width={1100}
      height={650}
      backgroundColor={0xffffff}
      antialias
    >
      <PendulumContents />
    </Application>
  );
}
