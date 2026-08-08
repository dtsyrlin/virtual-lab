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

import { BouncingBallPhysics } from "../PhysicalSystems/BouncingBallPhysics";

const PIXELS_PER_METER = 500;

function BouncingBallContents() {

  const ballRef = useRef<Ball2D | null>(null);
  const physicsRef = useRef<BouncingBallPhysics | null>(null);
  const timerRef = useRef<Timer2D | null>(null);

  useExperiment2D(
    (experiment: Experiment2D) => {

      const timer = new Timer2D(1000, 60);
      timerRef.current = timer;
      experiment.add(timer);

      experiment.add(
        new Table2D(
          0.3,                // x position in meters
          1.2,               // top surface in meters from screen top
          2.2,                // width in meters
          0.05,               // thickness in meters
          PIXELS_PER_METER
        )
      );

      experiment.add(
        new Ruler2D(
          1,
          {
            x: 60,
            y: 600,
          },
          PIXELS_PER_METER,
          "vertical"
        )
      );

      const ball = new Ball2D(
        1.0, // x
        0.4, // y
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
            9.81
          );
      };

      experiment.add(ball);
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
  return (
    <Application
      resizeTo={window}
      backgroundColor={0xe8edf2}
      antialias
    >
      <BouncingBallContents />
    </Application>
  );
}