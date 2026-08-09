import { useTick } from "@pixi/react";
import { useRef } from "react";

import {
  Application,
} from "@pixi/react";

import {
  Experiment2D,
  useExperiment2D,
} from "./Experiment2D";

import {
  Ruler2D,
} from "../Objects/Ruler2D";

import {
  Table2D,
} from "../Objects/Table2D";

import {
  Ball2D,
} from "../Objects/Ball2D";

import {
  Timer2D,
} from "../Objects/Timer2D";

import {
  GravitySelector2D,
} from "../Objects/GravitySelector2D";

import { BouncingBallPhysics } from "../PhysicalSystems/BouncingBallPhysics";

const PIXELS_PER_METER = 500;

const TableTopPosMetersFromTop = 1.2; // top surface in meters from screen top


function BouncingBallContents({
  gravityRef,
}: {
  gravityRef: React.MutableRefObject<number>;
}) {
  const ballRef = useRef<Ball2D | null>(null);
  const physicsRef = useRef<BouncingBallPhysics | null>(null);
  const timerRef = useRef<Timer2D | null>(null);

  useExperiment2D(
    (experiment: Experiment2D) => {

      const timer = new Timer2D(700, 100);
      timerRef.current = timer;
      experiment.add(timer);

      experiment.add(
        new Table2D(
          0.3,          // x position in meters
          TableTopPosMetersFromTop,  // top surface in meters from screen top
          2.2,          // width in meters
          0.05,         // thickness in meters
          PIXELS_PER_METER
        )
      );

      experiment.add(
        new Ruler2D(
          1,
          {
            x: 0.8 * PIXELS_PER_METER,
            y: TableTopPosMetersFromTop * PIXELS_PER_METER,
          },
          PIXELS_PER_METER,
          "vertical"
        )
      );

      const ball = new Ball2D(
        1.0, // x
        TableTopPosMetersFromTop - 0.1, // y
        0.1, // radius
        1.2,
        PIXELS_PER_METER
      );
      ballRef.current = ball;

      ball.onDropped = (initialY, bottomY) => {
        physicsRef.current =
          new BouncingBallPhysics(
            initialY,
            bottomY,
            gravityRef.current
          );
      };

      experiment.add(ball);

      const gravitySelector =
        new GravitySelector2D(
          700,
          40
        );


      gravitySelector.onGravityChanged =
        (gravity) => {
          gravityRef.current = gravity;

          physicsRef.current?.setAcceleration(gravity);
      };


      experiment.add(
        gravitySelector
      );



    }
  );

useTick((ticker) => {
  const ball = ballRef.current;
  const physics = physicsRef.current;
  const timer = timerRef.current;

  const deltaTime =
    ticker.deltaMS / 1000;

  timer?.update(deltaTime);


  if (
    ball === null ||
    physics === null ||
    ball.state !== "falling"
  ) {
    return;
  }


  const newY =
    physics.move(deltaTime);

  ball.setPositionMeters(
    ball.xMeters,
    newY
  );


});

  return null;
}

export default function BouncingBall() {
    const gravityRef =
        useRef(9.81);
  return (

      <Application
        resizeTo={window}
        backgroundColor={0xe8edf2}
        antialias
      >
        <BouncingBallContents gravityRef={gravityRef} />
      </Application>

  );
}