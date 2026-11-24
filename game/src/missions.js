// missions.js — the eight story jobs of Senja Bay, each three stages
// deep. A stage is one of four verbs the engine in main.js knows how
// to run: goto (be somewhere), clear (drop N Kerang Boys somewhere),
// escape (break the SBPD's line of sight and stay broken), lift
// (take one particular car). Givers open and close their own jobs;
// the two jobs the screenshots pin down — SIRENS AT DUSK and THE
// LONG TABLE — carry their staged wording word for word.

export const JOBS = [
  {
    giver: "SINTA", title: "FIRST FARE", pay: 400, respect: 120,
    open: { name: "Sinta", role: "DRIVER — CREW", color: "#d8493b", text: "You drive, I talk, the bay pays. Start simple: one Kijang, one bengkel, no heroes." },
    stages: [
      { verb: "goto", x: 285, z: -60, r: 6, obj: "Meet Sinta at the strand safehouse", next: "Take the Kijang down to Bima's bengkel" },
      { verb: "goto", x: 58, z: -80, r: 9, car: true, obj: "Drive to Bima's bengkel in Kota Lama", next: "Collect your cut from Bima" },
      { verb: "goto", x: 62, z: -88, r: 5, obj: "Collect your cut from Bima", next: "Job done — the bay is watching now" },
    ],
  },
  {
    giver: "BIMA", title: "GREASE MONEY", pay: 650, respect: 180,
    open: { name: "Bima", role: "MECHANIC — CREW", color: "#2e7fd9", text: "Kerang Boys owe me for three engines and a gearbox. Collect in person — they respect invoices with knuckles." },
    stages: [
      { verb: "goto", x: 62, z: -88, r: 5, obj: "Talk to Bima at the bengkel", next: "Visit the Kerang debtors in Kota Lama" },
      { verb: "clear", x: -150, z: -120, r: 26, n: 3, obj: "Collect the Kerang debt — {left} still standing", next: "Bring the money back to Bima" },
      { verb: "goto", x: 62, z: -88, r: 5, obj: "Bring the money back to Bima", next: "Job done — grease paid in full" },
    ],
  },
  {
    giver: "LARAS", title: "EYES ON THE STRAND", pay: 550, respect: 200,
    open: { name: "Laras", role: "LOOKOUT — CREW", color: "#2a9d8f", text: "I watch the bay so the bay doesn't watch us. Walk my three lookouts and tell me the Strand is quiet." },
    stages: [
      { verb: "goto", x: 300, z: 150, r: 6, obj: "Check the south lookout on the sand", next: "Check the pier lookout" },
      { verb: "goto", x: 330, z: 40, r: 6, obj: "Check the pier lookout", next: "Check the north lookout" },
      { verb: "goto", x: 298, z: -120, r: 6, obj: "Check the north lookout", next: "Report back — the Strand is ours tonight" },
    ],
  },
  {
    giver: "PAK HAJI OMAN", title: "HARBOUR DUES", pay: 900, respect: 260,
    open: { name: "Pak Haji Oman", role: "THE LONG TABLE", color: "#c9962e", text: "Every crate in Pelabuhan pays its dues, except the ones the Kerang Boys guard. Persuade them." },
    stages: [
      { verb: "goto", x: 176, z: 196, r: 8, obj: "Reach the port gate on the shore road", next: "Clear the dues guards from the container rows" },
      { verb: "clear", x: 215, z: 250, r: 30, n: 4, obj: "Clear the dues guards — {left} still standing", next: "Report to Oman's diner" },
      { verb: "goto", x: 168, z: 158, r: 6, obj: "Report to Oman's diner", next: "Job done — the port pays again" },
    ],
  },
  {
    giver: "SINTA", title: "NIGHT MARKET RUN", pay: 1100, respect: 300,
    open: { name: "Sinta", role: "DRIVER — CREW", color: "#d8493b", text: "A Kerang crew is taxing Pasar Malam stalls tonight. The stallholders pay us better. Run them out of the aisles." },
    stages: [
      { verb: "goto", x: -160, z: 110, r: 8, obj: "Reach the market's east mouth", next: "Run the Kerang tax crew out of aisle two" },
      { verb: "clear", x: -212, z: 110, r: 24, n: 5, obj: "Run the tax crew out — {left} still standing", next: "Lose the heat in the market lanes" },
      { verb: "escape", obj: "Lose the heat — break line of sight and stay hidden", next: "Job done — the market eats free tonight" },
    ],
  },
  {
    giver: "SINTA", title: "SIRENS AT DUSK", pay: 1400, respect: 380,
    open: { name: "Sinta", role: "DRIVER — CREW", color: "#d8493b", text: "Every cruiser in the bay and Air One want that orange Pelo. Forty seconds on the Strand, then you vanish." },
    stages: [
      { verb: "lift", x: 268, z: 96, r: 7, family: "pelo", paint: 0xe8641c, obj: "Lift the orange Pelo GT from the strand lot", next: "Lose the tail — reach the boulevard" },
      { verb: "escape", obj: "Lose the police — break line of sight and stay hidden", next: "Vanish to the strand safehouse" },
      { verb: "goto", x: 285, z: -60, r: 7, obj: "Vanish to the strand safehouse", next: "Walk away clean" },
    ],
  },
  {
    giver: "PAK HAJI OMAN", title: "THE LONG TABLE", pay: 1800, respect: 460,
    open: { name: "Bima", role: "MECHANIC — CREW", color: "#2e7fd9", text: "Blockade crews on the port road, Raka. The Long Table sits when this road is clear — drop them between the containers." },
    stages: [
      { verb: "goto", x: 209, z: 198, r: 10, obj: "Reach the port road blockade", next: "Clear the blockade crews" },
      { verb: "clear", x: 206, z: 196, r: 24, n: 6, obj: "Clear the port road blockade crews — {left} left", next: "Escort the talk — reach Oman's diner" },
      { verb: "goto", x: 168, z: 158, r: 6, obj: "Escort the talk — reach Oman's diner", next: "Collect from the Long Table" },
    ],
  },
  {
    giver: "PAK HAJI OMAN", title: "SENJA BAY HEAT", pay: 2600, respect: 700,
    open: { name: "Pak Haji Oman", role: "THE LONG TABLE", color: "#c9962e", text: "Tonight the Table takes the whole bay or loses it. Downtown first. Then the port. Then we eat." },
    stages: [
      { verb: "clear", x: 20, z: 60, r: 30, n: 6, obj: "Take the downtown corner — {left} still standing", next: "Lose the SBPD before the port run" },
      { verb: "escape", obj: "Lose the police — break line of sight and stay hidden", next: "Reach Oman's diner for the last sitting" },
      { verb: "goto", x: 168, z: 158, r: 6, obj: "Reach Oman's diner for the last sitting", next: "The bay is yours, Raka" },
    ],
  },
];

// The stage's objective line with its live counter folded in.
export function stageObjective(job, stageIndex, left) {
  const stage = job.stages[stageIndex];
  if (!stage) return "";
  return stage.obj.replace("{left}", String(Math.max(0, left != null ? left : stage.n || 0)));
}
