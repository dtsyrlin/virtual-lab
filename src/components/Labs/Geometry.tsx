
import {
  Application,
} from "@pixi/react";

import {
  Experiment2D,
  useExperiment2D,
} from "./Experiment2D";

import {
  DrawingRuler2D,
} from "../Objects/DrawingRuler2D";

import {
  Eraser2D,
} from "../Objects/Eraser2D";

import {
  Protractor2D,
} from "../Objects/Protractor2D";

import {
  Pencil2D,
} from "../Objects/Pencil2D";

import {
  DrawingSurface2D,
} from "../Objects/DrawingSurface2D";


const PIXELS_PER_METER = 500;


function GeometryContents() {

  useExperiment2D(
    (experiment: Experiment2D) => {

    const drawing =
      new DrawingSurface2D();

    /*
     * Add it first so drawings appear
     * underneath the tools.
     */
    experiment.add(drawing);

    const ruler1 =
      new DrawingRuler2D(
        1,
        {
          x: 50,
          y: 600,
        },
        PIXELS_PER_METER,
        drawing,
        "vertical"
      );

    const ruler2 =
      new DrawingRuler2D(
        0.5,
        {
          x: 120,
          y: 600,
        },
        PIXELS_PER_METER,
        drawing,
        "vertical"
      );

    experiment.add(ruler1);
    experiment.add(ruler2);


    experiment.add(
      new Protractor2D(
        0.3,
        {
          x: 400,
          y: 600,
        },
        PIXELS_PER_METER,
      )
    );



    experiment.add(
      new Eraser2D(
        drawing,
        { x: 600, y: 590 }
      )
    );    

    experiment.add(    
      new Pencil2D(
        drawing,
        {
          position: {
            x: 700,
            y: 600,
          },
        }
      )
    );


    }
  );

  return null;
}




export default function Geometry() {
  return (

      <Application
        resizeTo={window}
        backgroundColor={0xe8edf2}
        antialias
      >
        <GeometryContents  />
      </Application>

  );
}