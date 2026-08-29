import {
  Application,
} from "@pixi/react";

import {
  Container,
  Graphics,
} from "pixi.js";

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

      // ==================================================
      // RULER FACTORY
      // ==================================================

      const factory =
        new Container();

      factory.position.set(
        50,
        600
      );


      /*
       * This ruler is only the visual ruler
       * shown in the factory.
       *
       * It is never dragged out of the factory.
       */
      const factoryRuler =
        new Ruler2D(
          1,
          {
            x: 0,
            y: 0,
          },
          PIXELS_PER_METER,
          "vertical"
        );

      factory.addChild(
        factoryRuler
      );


      /*
       * Transparent layer on top of the ruler.
       *
       * It intercepts the click before the
       * factory ruler can begin dragging.
       */
      const factoryHitArea =
        new Graphics();

      factoryHitArea
        .rect(
          0,
          -PIXELS_PER_METER,
          50,
          PIXELS_PER_METER
        )
        .fill({
          color: 0xffffff,
          alpha: 0.001,
        });

      factoryHitArea.eventMode =
        "static";

      factoryHitArea.cursor =
        "pointer";


      factoryHitArea.on(
        "pointerdown",
        (event) => {

          if (
            event.button !== 0
          ) {
            return;
          }

          event.stopPropagation();


          const ruler =
            new Ruler2D(
              1,
              {
                x: 120,
                y: 600,
              },
              PIXELS_PER_METER,
              "vertical"
            );

          experiment.add(
            ruler
          );
        }
      );


      factory.addChild(
        factoryHitArea
      );


      experiment.add(
        factory
      );


      // ==================================================
      // PROTRACTOR
      // ==================================================

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
      <ProtractorAndRulersContents />
    </Application>

  );
}
