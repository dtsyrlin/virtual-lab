export type SpringAxis =
  | "horizontal"
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
  width: number;

  velocity: number;
  acceleration: number;
};


export type AnchorState = {
  id: string;

  position: Point2D;
};


export type ChainItem =
  | {
      type: "spring";
      id: string;
    }
  | {
      type: "weight";
      id: string;
    }
  | {
      type: "anchor";
      id: string;
    };


type ObjectType =
  | "spring"
  | "weight"
  | "anchor"
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

  leftWeightGroup:
    WeightGroup | null;

  rightWeightGroup:
    WeightGroup | null;

  rightAnchor:
    AnchorState | null;
};



export class SpringPhysics {

  private springs =
    new Map<string, SpringState>();


  private weights =
    new Map<string, WeightState>();


  private anchors =
    new Map<string, AnchorState>();


  private chain:
    ChainItem[] = [];


  //
  // Fixed left wall.
  //

  private anchorX:
    number | null = null;


  private running =
    false;


  //
  // Damping is only active for weights
  // currently under the mouse.
  //

  private dampedWeightIds =
    new Set<string>();


  private dampingCoefficient =
    5;



  // =====================================================
  // Registration
  // =====================================================


  addSpring(
    id: string,
    position: Point2D,
    length: number,
    k: number,
    axis: SpringAxis,
  ) {

    this.springs.set(
      id,
      {
        id,

        position: {
          ...position,
        },

        length,
        currentLength: length,

        k,
        axis,
      },
    );
  }


  addWeight(
    id: string,
    position: Point2D,
    mass: number,
    width = 0,
  ) {

    this.weights.set(
      id,
      {
        id,

        position: {
          ...position,
        },

        mass,
        width,

        velocity: 0,
        acceleration: 0,
      },
    );
  }


  addAnchor(
    id: string,
    position: Point2D,
  ) {

    this.anchors.set(
      id,
      {
        id,

        position: {
          ...position,
        },
      },
    );
  }



  // =====================================================
  // Chain
  // =====================================================


  private isInChain(
    type:
      "spring" |
      "weight" |
      "anchor",

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


    //
    // Nothing can follow a
    // right-side anchor.
    //

    const last =
      this.chain[
        this.chain.length - 1
      ];


    if (
      last?.type === "anchor"
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

      this.anchorX =
        spring.position.x;
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
    // Weight cannot start a chain.
    //

    if (
      this.chain.length === 0
    ) {

      return false;
    }


    //
    // Nothing follows the
    // right-side anchor.
    //

    const last =
      this.chain[
        this.chain.length - 1
      ];


    if (
      last.type === "anchor"
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


  appendAnchor(
    id: string,
  ): boolean {

    const anchor =
      this.anchors.get(id);


    if (
      !anchor ||
      this.isInChain(
        "anchor",
        id,
      )
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
    // Right attachment can only
    // attach directly to a spring.
    //

    if (
      last.type !== "spring"
    ) {

      return false;
    }


    this.chain.push({
      type: "anchor",
      id,
    });


    this.updateSpringGeometryFromWeights();


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
    // LEFT WALL -> SPRING
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


      this.anchorX =
        spring.position.x;


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
    // end of the chain.
    //

    if (
      last.type !== parentType ||
      last.id !== parentId
    ) {

      return false;
    }


    //
    // Once right anchor is attached,
    // nothing may follow it.
    //

    if (
      last.type === "anchor"
    ) {

      return false;
    }


    //
    // spring / weight
    //

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


    //
    // Only:
    //
    // spring -> anchor
    //
    // is legal.
    //

    if (
      childType === "anchor"
    ) {

      if (
        parentType !== "spring"
      ) {

        return false;
      }


      return this.appendAnchor(
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
      childType !== "weight" &&
      childType !== "anchor"
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
    // Still enforce our rule:
    //
    // only final object can leave.
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

      this.anchorX =
        null;

      this.stop();

    } else {

      this.relaxTrailingSprings();

      this.layoutChain();
    }


    return true;
  }


  disconnectFrom(
    parentType: ObjectType,
    parentId: string,
  ): boolean {

    //
    // Breaking chain in the middle
    // remains forbidden.
    //

    void parentType;
    void parentId;

    return false;
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

      this.anchorX =
        position.x;
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


  setAnchorPosition(
    id: string,
    position: Point2D,
  ) {

    const anchor =
      this.anchors.get(id);


    if (!anchor) {
      return;
    }


    anchor.position = {
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


resetChainToNaturalLengths(
  moveRightAnchor = false,
) {

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


  this.layoutChain(
    moveRightAnchor,
  );
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


  private getWeightGroupWidth(
    group: WeightGroup,
  ) {

    return group.weights.reduce(
      (
        sum,
        weight,
      ) =>
        sum +
        weight.width,

      0,
    );
  }


  private getWeightGroupLeftX(
    group: WeightGroup,
  ) {

    return group.weights[0]
      .position.x;
  }


  private getWeightGroupRightX(
    group: WeightGroup,
  ) {

    return (
      this.getWeightGroupLeftX(
        group,
      ) +
      this.getWeightGroupWidth(
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


      const leftWeightGroup =
        weightGroups.find(
          group =>
            group.endIndex ===
            startIndex - 1,
        ) ?? null;


      const rightWeightGroup =
        weightGroups.find(
          group =>
            group.startIndex ===
            endIndex + 1,
        ) ?? null;


      //
      // A spring group can also end
      // at the right-side anchor.
      //

      let rightAnchor:
        AnchorState | null =
          null;


      const nextItem =
        this.chain[
          endIndex + 1
        ];


      if (
        nextItem?.type ===
        "anchor"
      ) {

        rightAnchor =
          this.anchors.get(
            nextItem.id,
          ) ?? null;
      }


      groups.push({

        springs:
          groupSprings,

        startIndex,
        endIndex,

        leftWeightGroup,
        rightWeightGroup,

        rightAnchor,
      });
    }


    return groups;
  }



  // =====================================================
  // Manual movement of weight
  // =====================================================

manuallyMoveWeight(
  weightId: string,
  targetX: number,
) {

  if (
    this.anchorX === null
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
  // LEFT edge of the entire rigid
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
      weight.width;
  }


  let targetGroupLeftX =
    targetX -
    offsetInsideGroup;


  //
  // Find attached right anchor,
  // if there is one.
  //

  const last =
    this.chain[
      this.chain.length - 1
    ];


  const rightAnchor =
    last?.type === "anchor"
      ? this.anchors.get(
          last.id,
        ) ?? null
      : null;


  // =====================================================
  // NO RIGHT ANCHOR
  //
  // Preserve our previous behavior:
  //
  // springs on left deform;
  // everything on right translates.
  // =====================================================

  if (!rightAnchor) {

    const participatingSprings:
      SpringState[] = [];


    let earlierWeightWidth = 0;


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

      } else if (
        item.type === "weight"
      ) {

        const weight =
          this.weights.get(
            item.id,
          );


        if (weight) {

          earlierWeightWidth +=
            weight.width;
        }
      }
    }


    if (
      participatingSprings.length === 0
    ) {
      return;
    }


    const desiredSpringLength =
      targetGroupLeftX -
      this.anchorX -
      earlierWeightWidth;


    this.distributeSeriesLength(
      participatingSprings,
      desiredSpringLength,
    );


    this.layoutChain();


    return;
  }


  // =====================================================
  // RIGHT ANCHOR ATTACHED
  //
  // wall -- springs -- [M] -- springs -- anchor
  //
  // The dragged mass determines TWO
  // independent available distances.
  // =====================================================


  const leftSprings:
    SpringState[] = [];


  const rightSprings:
    SpringState[] = [];


  let leftWeightWidth =
    0;


  let rightWeightWidth =
    this.getWeightGroupWidth(
      draggedGroup,
    );


  //
  // Everything LEFT of dragged group.
  //

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

        leftSprings.push(
          spring,
        );
      }

    } else if (
      item.type === "weight"
    ) {

      const weight =
        this.weights.get(
          item.id,
        );


      if (weight) {

        leftWeightWidth +=
          weight.width;
      }
    }
  }


  //
  // Everything RIGHT of dragged group,
  // up to the fixed anchor.
  //

  for (
    let i =
      draggedGroup.endIndex + 1;

    i <
      this.chain.length;

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

        rightSprings.push(
          spring,
        );
      }

    } else if (
      item.type === "weight"
    ) {

      const weight =
        this.weights.get(
          item.id,
        );


      if (weight) {

        rightWeightWidth +=
          weight.width;
      }
    }
  }


  if (
    leftSprings.length === 0 ||
    rightSprings.length === 0
  ) {
    return;
  }


  //
  // Determine physically possible
  // range for the dragged weight.
  //
  // Each spring remains constrained
  // to 0.5 L0 ... 1.5 L0.
  //

  const leftMinimum =
    leftSprings.reduce(
      (
        total,
        spring,
      ) =>
        total +
        spring.length * 0.5,

      0,
    );


  const leftMaximum =
    leftSprings.reduce(
      (
        total,
        spring,
      ) =>
        total +
        spring.length * 1.5,

      0,
    );


  const rightMinimum =
    rightSprings.reduce(
      (
        total,
        spring,
      ) =>
        total +
        spring.length * 0.5,

      0,
    );


  const rightMaximum =
    rightSprings.reduce(
      (
        total,
        spring,
      ) =>
        total +
        spring.length * 1.5,

      0,
    );


  //
  // Limits imposed from LEFT.
  //

  const minimumFromLeft =
    this.anchorX +
    leftWeightWidth +
    leftMinimum;


  const maximumFromLeft =
    this.anchorX +
    leftWeightWidth +
    leftMaximum;


  //
  // Limits imposed from RIGHT.
  //
  // Right anchor NEVER moves here.
  //

  const minimumFromRight =
    rightAnchor.position.x -
    rightWeightWidth -
    rightMaximum;


  const maximumFromRight =
    rightAnchor.position.x -
    rightWeightWidth -
    rightMinimum;


  const minimumX =
    Math.max(
      minimumFromLeft,
      minimumFromRight,
    );


  const maximumX =
    Math.min(
      maximumFromLeft,
      maximumFromRight,
    );


  if (
    minimumX > maximumX
  ) {

    //
    // System cannot satisfy all spring
    // limits simultaneously.
    //
    // Leave it unchanged.
    //

    return;
  }


  targetGroupLeftX =
    Math.max(
      minimumX,

      Math.min(
        maximumX,
        targetGroupLeftX,
      ),
    );


  //
  // LEFT side:
  //
  // wall -> dragged mass
  //

  const desiredLeftSpringLength =
    targetGroupLeftX -
    this.anchorX -
    leftWeightWidth;


  this.distributeSeriesLength(
    leftSprings,
    desiredLeftSpringLength,
  );


  //
  // RIGHT side:
  //
  // dragged mass -> fixed right anchor
  //

  const desiredRightSpringLength =
    rightAnchor.position.x -
    targetGroupLeftX -
    rightWeightWidth;


  this.distributeSeriesLength(
    rightSprings,
    desiredRightSpringLength,
  );


  //
  // Rebuild spring/weight positions,
  // but DO NOT move the right anchor.
  //

  this.layoutChain(
    false,
  );
}


  // =====================================================
  // Manual movement of right anchor
  // =====================================================


manuallyMoveAnchor(
  anchorId: string,
  targetX: number,
) {

  if (
    this.anchorX === null
  ) {
    return;
  }


  const last =
    this.chain[
      this.chain.length - 1
    ];


  //
  // Only the attached final anchor
  // can manipulate the chain.
  //

  if (
    last?.type !== "anchor" ||
    last.id !== anchorId
  ) {

    return;
  }


  const anchor =
    this.anchors.get(
      anchorId,
    );


  if (!anchor) {
    return;
  }


  const participatingSprings:
    SpringState[] = [];


  let totalWeightWidth =
    0;


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


      if (spring) {

        participatingSprings.push(
          spring,
        );
      }

    } else if (
      item.type === "weight"
    ) {

      const weight =
        this.weights.get(
          item.id,
        );


      if (weight) {

        totalWeightWidth +=
          weight.width;
      }
    }
  }


  if (
    participatingSprings.length === 0
  ) {
    return;
  }


  //
  // Mouse is asking for this total
  // amount of spring length:
  //
  // wall + springs + weights = anchor
  //

  const desiredSpringLength =
    targetX -
    this.anchorX -
    totalWeightWidth;


  //
  // Distribute deformation among
  // all participating springs:
  //
  // ΔL proportional to 1/k.
  //
  // This also applies each spring's
  // 0.5L ... 1.5L limits.
  //

  this.distributeSeriesLength(
    participatingSprings,
    desiredSpringLength,
  );


  //
  // Because individual springs may
  // have reached their limits, the
  // mouse's requested position may
  // not actually be achievable.
  //
  // Calculate the REAL resulting
  // total spring length.
  //

  const actualSpringLength =
    participatingSprings.reduce(
      (
        total,
        spring,
      ) =>
        total +
        spring.currentLength,

      0,
    );


  //
  // THIS WAS THE MISSING PART.
  //
  // The mouse is directly moving the
  // right anchor, so we are explicitly
  // allowed to update its position.
  //
  // Use the physically achievable
  // position after spring limits.
  //

  anchor.position.x =
    this.anchorX +
    totalWeightWidth +
    actualSpringLength;


  //
  // Rebuild springs and weights.
  //
  // Passing false means layoutChain
  // must NOT reposition the anchor.
  // We just positioned it ourselves.
  //

  this.layoutChain(
    false,
  );
}


  // =====================================================
  // Consecutive springs
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


    for (
      const spring of
      springs
    ) {

      spring.currentLength =
        spring.length;
    }


    let remainingDeformation =
      totalDeformation;


    let active =
      [...springs];


    while (
      active.length > 0
    ) {

      const inverseKTotal =
        active.reduce(
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


      const proposed =
        new Map<
          string,
          number
        >();


      for (
        const spring of
        active
      ) {

        const fraction =
          (1 / spring.k) /
          inverseKTotal;


        const deformation =
          remainingDeformation *
          fraction;


        proposed.set(
          spring.id,

          spring.length +
          deformation,
        );
      }


      let anyClamped =
        false;


      const stillActive:
        SpringState[] = [];


      for (
        const spring of
        active
      ) {

        const requested =
          proposed.get(
            spring.id,
          )!;


        const minimum =
          spring.length * 0.5;


        const maximum =
          spring.length * 1.5;


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
          const spring of
          active
        ) {

          spring.currentLength =
            proposed.get(
              spring.id,
            )!;
        }


        return;
      }


      const deformationUsed =
        springs.reduce(
          (
            total,
            spring,
          ) =>
            total +
            (
              spring.currentLength -
              spring.length
            ),

          0,
        );


      remainingDeformation =
        totalDeformation -
        deformationUsed;


      active =
        stillActive;
    }
  }


  // =====================================================
  // Dynamic spring distribution
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
    // During free dynamics there is NO
    // 0.5 L0 ... 1.5 L0 geometric clamp.
    //
    // The springs remain connected to the
    // moving masses. Extreme deformation is
    // handled by the nonlinear restoring
    // force instead.
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


    const absoluteDeformation =
      Math.abs(
        deformation,
      );


    const linearLimit =
      spring.length * 0.5;


    //
    // Ordinary Hooke's law through
    // +/- 50% deformation.
    //

    if (
      absoluteDeformation <=
      linearLimit
    ) {

      return (
        spring.k *
        deformation
      );
    }


    //
    // Beyond +/- 50%, transition to a
    // rapidly hardening spring.
    //
    // The force is continuous at the
    // 50% boundary and doubles for each
    // additional 10% of natural length.
    //

    const excessStrain =
      (
        absoluteDeformation -
        linearLimit
      ) /
      spring.length;


    const exponent =
      Math.min(
        excessStrain / 0.1,
        10,
      );


    const forceAtLinearLimit =
      spring.k *
      linearLimit;


    const magnitude =
      forceAtLinearLimit *
      Math.pow(
        2,
        exponent,
      );


    return (
      Math.sign(
        deformation,
      ) *
      magnitude
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
    // Current weight positions and
    // right-anchor position determine
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
      // A spring group only exerts
      // force if something constrains
      // its right side:
      //
      // weight OR right anchor.
      //

      if (
        !group.rightWeightGroup &&
        !group.rightAnchor
      ) {

        continue;
      }


      //
      // We NEVER create an equivalent k.
      //
      // Each spring already has its own
      // physical deformation.
      //
      // For ideal series springs these
      // individual values of k*x should
      // be equal.
      //
      // Average them only to eliminate
      // tiny floating point differences.
      //

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
      // Weight group on LEFT:
      // receives +F.
      //

      if (
        group.leftWeightGroup
      ) {

        const id =
          group.leftWeightGroup.id;


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
      // Weight group on RIGHT:
      // receives -F.
      //
      // If right side is the anchor,
      // there is deliberately NO
      // acceleration calculation.
      //

      if (
        group.rightWeightGroup
      ) {

        const id =
          group.rightWeightGroup.id;


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
    // F = ma only for actual masses.
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


      const firstWeight =
        group.weights[0];


      //
      // If the mouse is currently over
      // any weight in this rigid group,
      // add a force opposite the group's
      // current velocity.
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


      const dx =
        velocity *
        dt;


      //
      // Joined weights move as one
      // rigid mass.
      //

      for (
        const weight of
        group.weights
      ) {

        weight.acceleration =
          acceleration;


        weight.velocity =
          velocity;


        weight.position.x +=
          dx;
      }
    }


    //
    // The right anchor is intentionally
    // NOT updated here.
    //
    // Only mouse interaction may move it.
    //

    this.updateSpringGeometryFromWeights(
      true,
    );
  }



  // =====================================================
  // Geometry
  // =====================================================

private layoutChain(
  moveRightAnchor = false,
) {

  if (
    this.anchorX === null
  ) {
    return;
  }


  let x =
    this.anchorX;


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


      spring.position.x =
        x;


      x +=
        spring.currentLength;


      continue;
    }


    if (
      item.type === "weight"
    ) {

      const weight =
        this.weights.get(
          item.id,
        );


      if (!weight) {
        continue;
      }


      weight.position.x =
        x;


      x +=
        weight.width;


      continue;
    }


    //
    // RIGHT ANCHOR
    //
    // Normally NEVER reposition it.
    //

    const anchor =
      this.anchors.get(
        item.id,
      );


    if (!anchor) {
      continue;
    }


    if (
      moveRightAnchor
    ) {

      anchor.position.x =
        x;
    }
  }
}

  private updateSpringGeometryFromWeights(
    dynamic = false,
  ) {

    if (
      this.anchorX === null
    ) {
      return;
    }


    const groups =
      this.getSpringGroups();


    for (
      const group of
      groups
    ) {

      let leftX:
        number;


      if (
        group.leftWeightGroup
      ) {

        leftX =
          this.getWeightGroupRightX(
            group.leftWeightGroup,
          );

      } else {

        leftX =
          this.anchorX;
      }


      //
      // Determine right boundary.
      //

      let rightX:
        number | null =
          null;


      if (
        group.rightWeightGroup
      ) {

        rightX =
          this.getWeightGroupLeftX(
            group.rightWeightGroup,
          );

      } else if (
        group.rightAnchor
      ) {

        rightX =
          group.rightAnchor.position.x;
      }


      //
      // No object constrains right side:
      // trailing springs are unloaded.
      //

      if (
        rightX === null
      ) {

        let x =
          leftX;


        for (
          const spring of
          group.springs
        ) {

          spring.currentLength =
            spring.length;


          spring.position.x =
            x;


          x +=
            spring.length;
        }


        continue;
      }


      const availableLength =
        rightX -
        leftX;


      //
      // Explicitly distribute total
      // deformation according to 1/k.
      //

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


      let x =
        leftX;


      for (
        const spring of
        group.springs
      ) {

        spring.position.x =
          x;


        x +=
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


    //
    // If group ends at a weight
    // or anchor, it is constrained.
    //

    if (
      last.rightWeightGroup ||
      last.rightAnchor
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

    return Math.max(
      spring.length * 0.5,

      Math.min(
        spring.length * 1.5,
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


  getAnchor(
    id: string,
  ) {

    return this.anchors.get(
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
      parentType !== "weight" &&
      parentType !== "anchor"
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
      childType !== "weight" &&
      childType !== "anchor"
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
          "wall",

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
          "wall",

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