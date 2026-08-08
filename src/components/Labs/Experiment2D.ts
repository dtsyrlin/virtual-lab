import {
  Application as PixiApplication,
  Container,
} from "pixi.js";

import {
  useApplication,
} from "@pixi/react";

import {
  useEffect,
  useRef,
} from "react";

/**
 * Base container for a two-dimensional experiment.
 *
 * It owns a Pixi scene and manages all visual objects
 * that belong to the experiment.
 */
export class Experiment2D {
  private readonly app: PixiApplication;
  private readonly scene: Container;

  constructor(app: PixiApplication) {
    this.app = app;
    this.scene = new Container();

    this.app.stage.addChild(this.scene);
  }

  /**
   * Add a visual object to the experiment.
   */
  public add(object: Container): void {
    this.scene.addChild(object);
  }

  /**
   * Remove a visual object without destroying it.
   */
  public remove(object: Container): void {
    this.scene.removeChild(object);
  }

  /**
   * Destroy the experiment and all its visual objects.
   */
  public destroy(): void {
    this.app.stage.removeChild(this.scene);

    this.scene.destroy({
      children: true,
    });
  }
}

/**
 * React adapter for Experiment2D.
 *
 * This hook hides:
 *
 * - useApplication()
 * - useRef()
 * - useEffect()
 * - duplicate creation protection
 * - experiment cleanup
 */
export function useExperiment2D(
  initialize: (experiment: Experiment2D) => void
): void {
  const { app } = useApplication();

  const experimentRef =
    useRef<Experiment2D | null>(null);

  /*
   * Remember the initialization function without making
   * the effect run again whenever the React component renders.
   */
  const initializeRef = useRef(initialize);
  initializeRef.current = initialize;

  useEffect(() => {
    if (experimentRef.current !== null) {
      return;
    }

    const experiment = new Experiment2D(app);

    initializeRef.current(experiment);

    experimentRef.current = experiment;

    return () => {
      experiment.destroy();
      experimentRef.current = null;
    };
  }, [app]);
}