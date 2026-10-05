export interface Gauge {
  stitchesPer10cm: number;
  rowsPer10cm: number;
}

export interface HatInput {
  headCircumferenceCm: number;
  heightCm: number;
  gauge: Gauge;
  easePercent?: number; // negative ease: the hat stretches to fit
}

export interface HatPattern {
  castOn: number;
  bodyRounds: number;
  crownDecreaseRounds: number;
  stitchTotal: number; // all stitches worked, for the yarn estimate
  finished: string[];
  steps: string[];
}

const WEDGES = 8; // ponytail: fixed 8-wedge crown, make it a parameter when other crown shapes appear
const RIB_ROUNDS = 8;

const per10 = (cm: number, count: number) => (cm / 10) * count;

export function hatPattern({ headCircumferenceCm, heightCm, gauge, easePercent = -10 }: HatInput): HatPattern {
  if (headCircumferenceCm <= 0 || heightCm <= 0 || gauge.stitchesPer10cm <= 0 || gauge.rowsPer10cm <= 0) {
    throw new Error("measurements and gauge must be positive");
  }
  const widthCm = headCircumferenceCm * (1 + easePercent / 100);
  // round to a multiple of 8 so the crown splits evenly and 2x2 rib fits
  const castOn = Math.max(WEDGES * 2, Math.round(per10(widthCm, gauge.stitchesPer10cm) / WEDGES) * WEDGES);
  const decreaseRounds = castOn / WEDGES - 1; // each removes 8 stitches until 8 are left
  const crownRounds = decreaseRounds * 2; // decrease every other round
  const totalRounds = Math.round(per10(heightCm, gauge.rowsPer10cm));
  const bodyRounds = Math.max(RIB_ROUNDS, totalRounds - crownRounds);

  const steps = [
    `Cast on ${castOn} stitches, join in the round.`,
    `Rounds 1-${RIB_ROUNDS}: rib (k2, p2).`,
    `Rounds ${RIB_ROUNDS + 1}-${bodyRounds}: knit every round.`,
    `Crown: repeat 2 rounds ${decreaseRounds} times: round A decrease ${WEDGES} stitches evenly (k2tog), round B knit.`,
    `Cut yarn, pull through the remaining ${WEDGES} stitches, fasten off.`,
  ];
  const finished = [`Circumference about ${Math.round(widthCm)} cm (stretches to ${headCircumferenceCm} cm)`, `Height about ${heightCm} cm`];
  const stitchTotal = castOn * bodyRounds + (castOn * crownRounds) / 2; // the crown shrinks to nothing, so on average half the stitches
  return { castOn, bodyRounds, crownDecreaseRounds: decreaseRounds, stitchTotal, finished, steps };
}
