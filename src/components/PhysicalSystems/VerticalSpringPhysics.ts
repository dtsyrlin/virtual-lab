export type SpringAxis =
  | "vertical";


export type Point2D = {
  x: number;
  y: number;
};


export type SpringState = {
  id: string;

  position: Point2D;

  length: number;
  currentLength: number;

  k: number;

  axis: SpringAxis;
};


export type WeightState = {
  id: string;

  position: Point2D;

  mass: number;
  height: number;

  velocity: number;
  acceleration: number;
};


export type ChainItem =
  | {
      type: "spring";
      id: string;
    }
  | {
      type: "weight";
      id: string;
    };


type ObjectType =
  | "spring"
  | "weight"
  | "frame";


export type Attachment = {
  parentType: ObjectType;
  parentId: string;

  childType: ObjectType;
  childId: string;
};


type WeightGroup = {
  id: string;

  weights: WeightState[];

  startIndex: number;
  endIndex: number;
};


type SpringGroup = {
  springs: SpringState[];

  startIndex: number;
  endIndex: number;

  topWeightGroup:
    WeightGroup | null;

  bottomWeightGroup:
    WeightGroup | null;
};



export class VerticalSpringPhysics {

  private springs =
    new Map<string, SpringState>();


  private weights =
    new Map<string, WeightState>();


  private chain:
    ChainItem[] = [];


  //
  // Fixed ceiling / top attachment.
  //

  private anchorY:
    number | null = null;


  private running =
    false;


  //
  // Positive y is DOWN in Pixi.
  //

  private gravity =
    9.81;


  //
  // Damping is active only for weights
  // currently under the mouse.
  //

  private dampedWeightIds =
    new Set<string>();


  private dampingCoefficient =
    0.5;



  // =====================================================
  // Registration
  // =====================================================


  addSpring(
    id: string,
    position: Point2D,
    length: number,
    k: number,
    axis: SpringAxis = "vertical",
  ) {

    this.springs.set(
      id,
      {
        id,

        position: {
          ...position,
        },

        length,
        currentLength:
          length,

        k,

        axis,
      },
    );
  }


  addWeight(
    id: string,
    position: Point2D,
    mass: number,
    height = 0,
  ) {

    this.weights.set(
      id,
      {
        id,

        position: {
          ...position,
        },

        mass,
        height,

        velocity: 0,
        acceleration: 0,
      },
    );
  }



  // =====================================================
  // Chain
  // =====================================================


  private isInChain(
    type:
      "spring" |
      "weight",

    id: string,
  ) {

    return this.chain.some(
      item =>
        item.type === type &&
        item.id === id,
    );
  }


  getChain() {

    return [
      ...this.chain,
    ];
  }


  appendSpring(
    id: string,
  ): boolean {

    const spring =
      this.springs.get(id);


    if (
      !spring ||
      this.isInChain(
        "spring",
        id,
      )
    ) {

      return false;
    }


    this.chain.push({
      type: "spring",
      id,
    });


    if (
      this.chain.length === 1
    ) {

      this.anchorY =
        spring.position.y;
    }


    this.layoutChain();


    return true;
  }


  appendWeight(
    id: string,
  ): boolean {

    const weight =
      this.weights.get(id);


    if (
      !weight ||
      this.isInChain(
        "weight",
        id,
      )
    ) {

      return false;
    }


    //
    // A weight cannot start the chain.
    //

    if (
      this.chain.length === 0
    ) {

      return false;
    }


    this.chain.push({
      type: "weight",
      id,
    });


    this.layoutChain();


    return true;
  }



  // =====================================================
  // Attachment
  // =====================================================


  attach(
    parentType: ObjectType,
    parentId: string,

    childType: ObjectType,
    childId: string,
  ): boolean {

    //
    // CEILING -> FIRST SPRING
    //

    if (
      parentType === "frame" &&
      childType === "spring"
    ) {

      if (
        this.chain.length !== 0
      ) {

        return false;
      }


      const spring =
        this.springs.get(
          childId,
        );


      if (!spring) {
        return false;
      }


      this.chain.push({
        type: "spring",
        id: childId,
      });


      this.anchorY =
        spring.position.y;


      return true;
    }


    if (
      this.chain.length === 0
    ) {

      return false;
    }


    const last =
      this.chain[
        this.chain.length - 1
      ];


    //
    // Parent must be the actual
    // bottom end of the chain.
    //

    if (
      last.type !== parentType ||
      last.id !== parentId
    ) {

      return false;
    }


    if (
      childType === "spring"
    ) {

      return this.appendSpring(
        childId,
      );
    }


    if (
      childType === "weight"
    ) {

      return this.appendWeight(
        childId,
      );
    }


    return false;
  }



  // =====================================================
  // Detachment
  // =====================================================


  disconnectChild(
    childType: ObjectType,
    childId: string,
  ): boolean {

    if (
      childType !== "spring" &&
      childType !== "weight"
    ) {

      return false;
    }


    if (
      this.chain.length === 0
    ) {

      return false;
    }


    const last =
      this.chain[
        this.chain.length - 1
      ];


    //
    // Only the bottom-most object
    // may be detached.
    //

    if (
      last.type !== childType ||
      last.id !== childId
    ) {

      return false;
    }


    this.chain.pop();


    if (
      childType === "weight"
    ) {

      const weight =
        this.weights.get(
          childId,
        );


      if (weight) {

        weight.velocity = 0;
        weight.acceleration = 0;
      }
    }


    if (
      this.chain.length === 0
    ) {

      this.anchorY =
        null;


      this.stop();

    } else {

      this.relaxTrailingSprings();

      this.layoutChain();
    }


    return true;
  }



  // =====================================================
  // State setters
  // =====================================================


  setSpringPosition(
    id: string,
    position: Point2D,
  ) {

    const spring =
      this.springs.get(id);


    if (!spring) {
      return;
    }


    spring.position = {
      ...position,
    };


    if (
      this.chain.length > 0 &&
      this.chain[0].type ===
        "spring" &&
      this.chain[0].id === id
    ) {

      this.anchorY =
        position.y;
    }
  }


  setWeightPosition(
    id: string,
    position: Point2D,
  ) {

    const weight =
      this.weights.get(id);


    if (!weight) {
      return;
    }


    weight.position = {
      ...position,
    };
  }


  setSpringCurrentLength(
    id: string,
    length: number,
  ) {

    const spring =
      this.springs.get(id);


    if (!spring) {
      return;
    }


    //
    // Manual manipulation stays
    // within +/- 30% of the current
    // vertical equilibrium length.
    //

    spring.currentLength =
      this.clampSpringLength(
        spring,
        length,
      );
  }


  resetSpringLength(
    id: string,
  ) {

    const spring =
      this.springs.get(id);


    if (!spring) {
      return;
    }


    spring.currentLength =
      spring.length;
  }


  resetChainToNaturalLengths() {

    this.stop();


    for (
      const item of
      this.chain
    ) {

      if (
        item.type !== "spring"
      ) {

        continue;
      }


      const spring =
        this.springs.get(
          item.id,
        );


      if (spring) {

        spring.currentLength =
          spring.length;
      }
    }


    this.layoutChain();
  }



  // =====================================================
  // Weight groups
  // =====================================================


  private getWeightGroups():
    WeightGroup[] {

    const groups:
      WeightGroup[] = [];


    let i = 0;


    while (
      i < this.chain.length
    ) {

      if (
        this.chain[i].type !==
        "weight"
      ) {

        i++;
        continue;
      }


      const startIndex =
        i;


      const groupWeights:
        WeightState[] = [];


      while (
        i < this.chain.length &&
        this.chain[i].type ===
          "weight"
      ) {

        const item =
          this.chain[i];


        if (
          item.type ===
          "weight"
        ) {

          const weight =
            this.weights.get(
              item.id,
            );


          if (weight) {

            groupWeights.push(
              weight,
            );
          }
        }


        i++;
      }


      const endIndex =
        i - 1;


      groups.push({

        id:
          groupWeights
            .map(
              weight =>
                weight.id,
            )
            .join("|"),

        weights:
          groupWeights,

        startIndex,
        endIndex,
      });
    }


    return groups;
  }


  private getWeightGroupContaining(
    weightId: string,
  ) {

    return this
      .getWeightGroups()
      .find(
        group =>
          group.weights.some(
            weight =>
              weight.id ===
              weightId,
          ),
      );
  }


  private getWeightGroupMass(
    group: WeightGroup,
  ) {

    return group.weights.reduce(
      (
        sum,
        weight,
      ) =>
        sum +
        weight.mass,

      0,
    );
  }


  private getWeightGroupHeight(
    group: WeightGroup,
  ) {

    return group.weights.reduce(
      (
        sum,
        weight,
      ) =>
        sum +
        weight.height,

      0,
    );
  }


  private getWeightGroupTopY(
    group: WeightGroup,
  ) {

    return group.weights[0]
      .position.y;
  }


  private getWeightGroupBottomY(
    group: WeightGroup,
  ) {

    return (
      this.getWeightGroupTopY(
        group,
      ) +
      this.getWeightGroupHeight(
        group,
      )
    );
  }



  // =====================================================
  // Spring groups
  // =====================================================


  private getSpringGroups():
    SpringGroup[] {

    const weightGroups =
      this.getWeightGroups();


    const groups:
      SpringGroup[] = [];


    let i = 0;


    while (
      i < this.chain.length
    ) {

      if (
        this.chain[i].type !==
        "spring"
      ) {

        i++;
        continue;
      }


      const startIndex =
        i;


      const groupSprings:
        SpringState[] = [];


      while (
        i < this.chain.length &&
        this.chain[i].type ===
          "spring"
      ) {

        const item =
          this.chain[i];


        if (
          item.type ===
          "spring"
        ) {

          const spring =
            this.springs.get(
              item.id,
            );


          if (spring) {

            groupSprings.push(
              spring,
            );
          }
        }


        i++;
      }


      const endIndex =
        i - 1;


      const topWeightGroup =
        weightGroups.find(
          group =>
            group.endIndex ===
            startIndex - 1,
        ) ?? null;


      const bottomWeightGroup =
        weightGroups.find(
          group =>
            group.startIndex ===
            endIndex + 1,
        ) ?? null;


      groups.push({

        springs:
          groupSprings,

        startIndex,
        endIndex,

        topWeightGroup,
        bottomWeightGroup,
      });
    }


    return groups;
  }



  // =====================================================
  // Vertical equilibrium lengths
  // =====================================================


  private getMassBelowSpring(
    springId: string,
  ) {

    const springIndex =
      this.chain.findIndex(
        item =>
          item.type === "spring" &&
          item.id === springId,
      );


    if (
      springIndex < 0
    ) {

      return 0;
    }


    let massBelow =
      0;


    for (
      let i =
        springIndex + 1;

      i <
        this.chain.length;

      i++
    ) {

      const item =
        this.chain[i];


      if (
        item.type !== "weight"
      ) {

        continue;
      }


      const weight =
        this.weights.get(
          item.id,
        );


      if (weight) {

        massBelow +=
          weight.mass;
      }
    }


    return massBelow;
  }


  private getEquilibriumLength(
    spring: SpringState,
  ) {

    const hangingMass =
      this.getMassBelowSpring(
        spring.id,
      );


    return (
      spring.length +
      hangingMass *
        this.gravity /
        spring.k
    );
  }


  // =====================================================
  // Manual movement of weight
  // =====================================================


  manuallyMoveWeight(
    weightId: string,
    targetY: number,
  ) {

    if (
      this.anchorY === null
    ) {

      return;
    }


    const draggedGroup =
      this.getWeightGroupContaining(
        weightId,
      );


    if (!draggedGroup) {
      return;
    }


    //
    // Convert mouse position to the
    // TOP edge of the whole rigid
    // weight group.
    //

    let offsetInsideGroup = 0;


    for (
      const weight of
      draggedGroup.weights
    ) {

      if (
        weight.id === weightId
      ) {

        break;
      }


      offsetInsideGroup +=
        weight.height;
    }


    const targetGroupTopY =
      targetY -
      offsetInsideGroup;


    //
    // Every spring ABOVE the dragged
    // group participates.
    //
    // Everything below the dragged
    // group simply follows.
    //

    const participatingSprings:
      SpringState[] = [];


    let earlierWeightHeight =
      0;


    for (
      let i = 0;
      i <
      draggedGroup.startIndex;
      i++
    ) {

      const item =
        this.chain[i];


      if (
        item.type === "spring"
      ) {

        const spring =
          this.springs.get(
            item.id,
          );


        if (spring) {

          participatingSprings.push(
            spring,
          );
        }

      } else {

        const weight =
          this.weights.get(
            item.id,
          );


        if (weight) {

          earlierWeightHeight +=
            weight.height;
        }
      }
    }


    if (
      participatingSprings.length === 0
    ) {

      return;
    }


    const desiredSpringLength =
      targetGroupTopY -
      this.anchorY -
      earlierWeightHeight;


    //
    // Manual movement is limited to
    // +/- 30% around each spring's
    // vertical equilibrium length.
    //

    this.distributeSeriesLength(
      participatingSprings,
      desiredSpringLength,
    );


    this.layoutChain();
  }



  // =====================================================
  // Manual series-spring distribution
  // =====================================================


  private distributeSeriesLength(
    springs: SpringState[],
    desiredTotalLength: number,
  ) {

    if (
      springs.length === 0
    ) {

      return;
    }


    const equilibriumLengths =
      new Map<string, number>();


    for (
      const spring of springs
    ) {

      equilibriumLengths.set(
        spring.id,
        this.getEquilibriumLength(
          spring,
        ),
      );
    }


    const equilibriumTotal =
      springs.reduce(
        (total, spring) =>
          total +
          equilibriumLengths.get(
            spring.id,
          )!,
        0,
      );


    const totalDisplacementFromEquilibrium =
      desiredTotalLength -
      equilibriumTotal;


    for (
      const spring of springs
    ) {

      spring.currentLength =
        equilibriumLengths.get(
          spring.id,
        )!;
    }


    let remainingDisplacement =
      totalDisplacementFromEquilibrium;


    let active =
      [...springs];


    while (
      active.length > 0
    ) {

      const inverseKTotal =
        active.reduce(
          (total, spring) =>
            total +
            1 / spring.k,
          0,
        );


      if (
        inverseKTotal <= 0
      ) {

        return;
      }


      const proposed =
        new Map<string, number>();


      for (
        const spring of active
      ) {

        const fraction =
          (1 / spring.k) /
          inverseKTotal;

        const displacement =
          remainingDisplacement *
          fraction;

        const equilibriumLength =
          equilibriumLengths.get(
            spring.id,
          )!;

        proposed.set(
          spring.id,
          equilibriumLength +
          displacement,
        );
      }


      let anyClamped =
        false;


      const stillActive: SpringState[] =
        [];


      for (
        const spring of active
      ) {

        const requested =
          proposed.get(
            spring.id,
          )!;

        const equilibriumLength =
          equilibriumLengths.get(
            spring.id,
          )!;

        const minimum =
          equilibriumLength *
          0.70;

        const maximum =
          equilibriumLength *
          1.30;


        if (
          requested < minimum
        ) {

          spring.currentLength =
            minimum;

          anyClamped =
            true;

        } else if (
          requested > maximum
        ) {

          spring.currentLength =
            maximum;

          anyClamped =
            true;

        } else {

          stillActive.push(
            spring,
          );
        }
      }


      if (!anyClamped) {

        for (
          const spring of active
        ) {

          spring.currentLength =
            proposed.get(
              spring.id,
            )!;
        }


        return;
      }


      const displacementUsed =
        springs.reduce(
          (total, spring) =>
            total +
            (
              spring.currentLength -
              equilibriumLengths.get(
                spring.id,
              )!
            ),
          0,
        );


      remainingDisplacement =
        totalDisplacementFromEquilibrium -
        displacementUsed;


      active =
        stillActive;
    }
  }


  // =====================================================
  // Dynamic series-spring distribution
  // =====================================================


  private distributeSeriesLengthDynamic(
    springs: SpringState[],
    desiredTotalLength: number,
  ) {

    if (
      springs.length === 0
    ) {

      return;
    }


    const naturalTotal =
      springs.reduce(
        (
          total,
          spring,
        ) =>
          total +
          spring.length,

        0,
      );


    const totalDeformation =
      desiredTotalLength -
      naturalTotal;


    const inverseKTotal =
      springs.reduce(
        (
          total,
          spring,
        ) =>
          total +
          1 / spring.k,

        0,
      );


    if (
      inverseKTotal <= 0
    ) {

      return;
    }


    //
    // During dynamics there is NO
    // geometric +/- 50% clamp.
    //
    // The spring remains connected to
    // the masses. Extreme deformation
    // is handled by nonlinear force.
    //

    for (
      const spring of
      springs
    ) {

      const fraction =
        (1 / spring.k) /
        inverseKTotal;


      spring.currentLength =
        spring.length +
        totalDeformation *
          fraction;
    }
  }



  // =====================================================
  // Dynamic spring force
  // =====================================================


  private getDynamicSpringForce(
    spring: SpringState,
  ) {

    const deformation =
      spring.currentLength -
      spring.length;


    //
    // Normal Hooke's-law force.
    //
    // This is always present.
    //

    const hookeForce =
      spring.k *
      deformation;


    const equilibriumLength =
      this.getEquilibriumLength(
        spring,
      );


    //
    // Safety region centered on the
    // current gravitational equilibrium.
    //
    // Inside +/- 30% of equilibrium
    // length, use ordinary Hooke's law.
    //

    const minimum =
      equilibriumLength *
      0.70;


    const maximum =
      equilibriumLength *
      1.30;


    if (
      spring.currentLength >=
        minimum &&
      spring.currentLength <=
        maximum
    ) {

      return hookeForce;
    }


    //
    // Outside the allowed region,
    // add an extra nonlinear restoring
    // force pointing back toward the
    // equilibrium region.
    //


    let excessDistance:
      number;


    let direction:
      number;


    if (
      spring.currentLength >
      maximum
    ) {

      excessDistance =
        spring.currentLength -
        maximum;


      //
      // Positive spring force means
      // stronger upward pull on the
      // weight below.
      //

      direction =
        1;

    } else {

      excessDistance =
        minimum -
        spring.currentLength;


      //
      // Extra force must push the
      // system downward toward the
      // allowed region.
      //

      direction =
        -1;
    }


    //
    // Measure excess relative to the
    // equilibrium length.
    //

    const excessFraction =
      excessDistance /
      equilibriumLength;


    //
    // Double the extra stiffness for
    // each additional 10% beyond the
    // safety region.
    //
    // Cap the exponent only to prevent
    // numerical overflow.
    //

    const exponent =
      Math.min(
        excessFraction /
          0.10,

        8,
      );


    //
    // Start the additional force
    // smoothly from zero at the
    // +/-30% boundary.
    //

    const extraForce =
      spring.k *
      excessDistance *
      Math.pow(
        2,
        exponent,
      );


    return (
      hookeForce +
      direction *
        extraForce
    );
  }

  // =====================================================
  // Damping
  // =====================================================


  setWeightDampingActive(
    weightId: string,
    active: boolean,
  ) {

    if (active) {

      this.dampedWeightIds.add(
        weightId,
      );

    } else {

      this.dampedWeightIds.delete(
        weightId,
      );
    }
  }



  // =====================================================
  // Dynamics
  // =====================================================


  start() {

    for (
      const weight of
      this.weights.values()
    ) {

      weight.velocity = 0;
      weight.acceleration = 0;
    }


    this.running =
      true;
  }


  stop() {

    this.running =
      false;


    for (
      const weight of
      this.weights.values()
    ) {

      weight.velocity = 0;
      weight.acceleration = 0;
    }
  }


  isRunning() {

    return this.running;
  }


  move(
    deltaTime: number,
  ) {

    if (
      !this.running ||
      this.chain.length === 0
    ) {

      return;
    }


    const dt =
      Math.min(
        deltaTime,
        0.033,
      );


    //
    // Current mass positions determine
    // spring geometry.
    //

    this.updateSpringGeometryFromWeights(
      true,
    );


    const weightGroups =
      this.getWeightGroups();


    const forces =
      new Map<string, number>();


    for (
      const group of
      weightGroups
    ) {

      forces.set(
        group.id,
        0,
      );
    }


    const springGroups =
      this.getSpringGroups();


    for (
      const group of
      springGroups
    ) {

      if (
        group.springs.length === 0
      ) {

        continue;
      }


      //
      // A trailing spring with no mass
      // below it is unloaded.
      //

      if (
        !group.bottomWeightGroup
      ) {

        continue;
      }


      const springForce =
        group.springs.reduce(
          (
            total,
            spring,
          ) =>
            total +
            this.getDynamicSpringForce(
              spring,
            ),

          0,
        ) /
        group.springs.length;


      //
      // Positive y is DOWN.
      //
      // A stretched spring pulls the
      // upper mass group downward.
      //

      if (
        group.topWeightGroup
      ) {

        const id =
          group.topWeightGroup.id;


        forces.set(
          id,

          (
            forces.get(id) ??
            0
          ) +
          springForce,
        );
      }


      //
      // The same stretched spring pulls
      // the lower mass group upward.
      //

      if (
        group.bottomWeightGroup
      ) {

        const id =
          group.bottomWeightGroup.id;


        forces.set(
          id,

          (
            forces.get(id) ??
            0
          ) -
          springForce,
        );
      }
    }


    //
    // F = ma for each rigid mass group.
    //

    for (
      const group of
      weightGroups
    ) {

      const mass =
        this.getWeightGroupMass(
          group,
        );


      if (
        mass <= 0
      ) {

        continue;
      }


      let force =
        forces.get(
          group.id,
        ) ?? 0;


      //
      // Gravity acts downward.
      //

      force +=
        mass *
        this.gravity;


      const firstWeight =
        group.weights[0];


      //
      // Mouse-over damping opposes
      // current vertical velocity.
      //

      const dampingActive =
        group.weights.some(
          weight =>
            this.dampedWeightIds.has(
              weight.id,
            ),
        );


      if (dampingActive) {

        force +=
          -this.dampingCoefficient *
          firstWeight.velocity;
      }


      const acceleration =
        force /
        mass;


      firstWeight.velocity +=
        acceleration *
        dt;


      const velocity =
        firstWeight.velocity;


      const dy =
        velocity *
        dt;


      //
      // Joined weights move as one
      // rigid vertical mass.
      //

      for (
        const weight of
        group.weights
      ) {

        weight.acceleration =
          acceleration;


        weight.velocity =
          velocity;


        weight.position.y +=
          dy;
      }
    }


    this.updateSpringGeometryFromWeights(
      true,
    );
  }



  // =====================================================
  // Geometry
  // =====================================================


  private layoutChain() {

    if (
      this.anchorY === null
    ) {

      return;
    }


    let y =
      this.anchorY;


    for (
      const item of
      this.chain
    ) {

      if (
        item.type === "spring"
      ) {

        const spring =
          this.springs.get(
            item.id,
          );


        if (!spring) {
          continue;
        }


        spring.position.y =
          y;


        y +=
          spring.currentLength;


        continue;
      }


      const weight =
        this.weights.get(
          item.id,
        );


      if (!weight) {
        continue;
      }


      weight.position.y =
        y;


      y +=
        weight.height;
    }
  }


  private updateSpringGeometryFromWeights(
    dynamic = false,
  ) {

    if (
      this.anchorY === null
    ) {

      return;
    }


    const groups =
      this.getSpringGroups();


    for (
      const group of
      groups
    ) {

      let topY:
        number;


      if (
        group.topWeightGroup
      ) {

        topY =
          this.getWeightGroupBottomY(
            group.topWeightGroup,
          );

      } else {

        topY =
          this.anchorY;
      }


      let bottomY:
        number | null =
          null;


      if (
        group.bottomWeightGroup
      ) {

        bottomY =
          this.getWeightGroupTopY(
            group.bottomWeightGroup,
          );
      }


      //
      // No mass below this spring group:
      // it is unloaded and returns to
      // natural length.
      //

      if (
        bottomY === null
      ) {

        let y =
          topY;


        for (
          const spring of
          group.springs
        ) {

          spring.currentLength =
            spring.length;


          spring.position.y =
            y;


          y +=
            spring.length;
        }


        continue;
      }


      const availableLength =
        bottomY -
        topY;


      if (dynamic) {

        this.distributeSeriesLengthDynamic(
          group.springs,
          availableLength,
        );

      } else {

        this.distributeSeriesLength(
          group.springs,
          availableLength,
        );
      }


      let y =
        topY;


      for (
        const spring of
        group.springs
      ) {

        spring.position.y =
          y;


        y +=
          spring.currentLength;
      }
    }
  }


  private relaxTrailingSprings() {

    const groups =
      this.getSpringGroups();


    const last =
      groups[
        groups.length - 1
      ];


    if (!last) {
      return;
    }


    if (
      last.bottomWeightGroup
    ) {

      return;
    }


    for (
      const spring of
      last.springs
    ) {

      spring.currentLength =
        spring.length;
    }
  }


  private clampSpringLength(
    spring: SpringState,
    length: number,
  ) {

    const equilibriumLength =
      this.getEquilibriumLength(
        spring,
      );


    return Math.max(
      equilibriumLength * 0.70,

      Math.min(
        equilibriumLength * 1.30,
        length,
      ),
    );
  }



  // =====================================================
  // Queries
  // =====================================================


  getSpring(
    id: string,
  ) {

    return this.springs.get(
      id,
    );
  }


  getWeight(
    id: string,
  ) {

    return this.weights.get(
      id,
    );
  }


  getChild(
    parentType: ObjectType,
    parentId: string,
  ): Attachment | undefined {

    if (
      parentType === "frame"
    ) {

      const first =
        this.chain[0];


      if (
        first?.type ===
          "spring"
      ) {

        return {
          parentType:
            "frame",

          parentId,

          childType:
            "spring",

          childId:
            first.id,
        };
      }


      return undefined;
    }


    if (
      parentType !== "spring" &&
      parentType !== "weight"
    ) {

      return undefined;
    }


    const index =
      this.chain.findIndex(
        item =>
          item.type ===
            parentType &&
          item.id ===
            parentId,
      );


    if (
      index < 0 ||
      index >=
        this.chain.length - 1
    ) {

      return undefined;
    }


    const child =
      this.chain[
        index + 1
      ];


    return {
      parentType,
      parentId,

      childType:
        child.type,

      childId:
        child.id,
    };
  }


  getParent(
    childType: ObjectType,
    childId: string,
  ): Attachment | undefined {

    if (
      childType !== "spring" &&
      childType !== "weight"
    ) {

      return undefined;
    }


    const index =
      this.chain.findIndex(
        item =>
          item.type ===
            childType &&
          item.id ===
            childId,
      );


    if (
      index < 0
    ) {

      return undefined;
    }


    if (
      index === 0
    ) {

      return {
        parentType:
          "frame",

        parentId:
          "ceiling",

        childType,
        childId,
      };
    }


    const parent =
      this.chain[
        index - 1
      ];


    return {
      parentType:
        parent.type,

      parentId:
        parent.id,

      childType,
      childId,
    };
  }


  getAttachments() {

    const result:
      Attachment[] = [];


    if (
      this.chain.length === 0
    ) {

      return result;
    }


    const first =
      this.chain[0];


    if (
      first.type === "spring"
    ) {

      result.push({
        parentType:
          "frame",

        parentId:
          "ceiling",

        childType:
          "spring",

        childId:
          first.id,
      });
    }


    for (
      let i = 0;
      i <
      this.chain.length - 1;
      i++
    ) {

      const parent =
        this.chain[i];


      const child =
        this.chain[i + 1];


      result.push({
        parentType:
          parent.type,

        parentId:
          parent.id,

        childType:
          child.type,

        childId:
          child.id,
      });
    }


    return result;
  }
}
