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
  PlanetarySystem2D,
} from "../Objects/PlanetarySystem2D";


const PIXELS_PER_METER = 190;


function PlanetaryMotionContents() {
  const systemRef =
    useRef<
      PlanetarySystem2D | null
    >(null);

  useExperiment2D(
    (
      experiment:
        Experiment2D
    ) => {
      const system =
        new PlanetarySystem2D({
          center: {
            x: 690,
            y: 250,
          },

          orbitRadiusPixels:
            PIXELS_PER_METER,
        });

      systemRef.current =
        system;

      experiment.add(
        system
      );
    }
  );

  useTick(
    ticker => {
      systemRef.current?.update(
        ticker.deltaMS /
        1000
      );
    }
  );

  return null;
}


export default function PlanetaryMotion() {
  return (
    <Application
      width={1100}
      height={650}
      backgroundColor={0xffffff}
      antialias
    >
      <PlanetaryMotionContents />
    </Application>
  );
}
