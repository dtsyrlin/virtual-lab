
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
  Protractor2D,
} from "../Objects/Protractor2D";


const PIXELS_PER_METER = 500;



function ProtractorAndRulersContents() {

  useExperiment2D(
    (experiment: Experiment2D) => {

    const ruler1 =
      new Ruler2D(
        1,
        {
          x: 50,
          y: 600,
        },
        PIXELS_PER_METER,
        "vertical"
      );

    const ruler2 =
      new Ruler2D(
        1,
        {
          x: 110,
          y: 600,
        },
        PIXELS_PER_METER,
        "vertical"
      );

    const ruler3 =
      new Ruler2D(
        1,
        {
          x: 170,
          y: 600,
        },
        PIXELS_PER_METER,
        "vertical"
      );

    const ruler4 =
      new Ruler2D(
        1,
        {
          x: 230,
          y: 600,
        },
        PIXELS_PER_METER,
        "vertical"
      );

    experiment.add(ruler1);
    experiment.add(ruler2);
    experiment.add(ruler3);
    experiment.add(ruler4);


    experiment.add(
      new Protractor2D(
        0.3,
        {
          x: 200,
          y: 600,
        },
        PIXELS_PER_METER,
      )
    );


    }
  );

  return null;
}




export default function ProtractorAndRulers() {
  return (

      <Application
        resizeTo={window}
        backgroundColor={0xe8edf2}
        antialias
      >
        <ProtractorAndRulersContents  />
      </Application>

  );
}