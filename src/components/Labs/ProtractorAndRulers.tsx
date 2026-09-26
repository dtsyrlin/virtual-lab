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
      // PROTRACTOR
      // ==================================================

      const protractor =
        new Protractor2D(
          0.3,
          {
            x: 400,
            y: 600,
          },
          PIXELS_PER_METER,
        );

      experiment.add(
        protractor
      );


      /*
       * The rulers bring themselves to the front when dragged.
       * Therefore simply adding the protractor last is not enough.
       * Use Pixi's zIndex sorting so the protractor always wins,
       * even after a ruler is selected or dragged.
       */
      if (protractor.parent) {
        protractor.parent.sortableChildren = true;
      }

      protractor.zIndex = 100000;


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

      // The factory ruler is display-only.  Ruler2D normally has its
      // own drag/rotation interactions (including interactive ends),
      // but none of those should be reachable while it lives in the factory.
      factoryRuler.eventMode = "none";

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


          // Create the ruler exactly on top of the factory.
          // Then forward this same pointer-down event to it so
          // the user is immediately dragging the new ruler.
          const ruler =
            new Ruler2D(
              1,
              {
                x: factory.position.x,
                y: factory.position.y,
              },
              PIXELS_PER_METER,
              "vertical"
            );

          experiment.add(
            ruler
          );

          ruler.zIndex = 0;

          ruler.emit(
            "pointerdown",
            event
          );
        }
      );


      factory.addChild(
        factoryHitArea
      );


      experiment.add(
        factory
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
