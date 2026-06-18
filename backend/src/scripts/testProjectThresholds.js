require("dotenv").config();
const { classifyProjectScore } = require("../services/projectEvaluation");

const cases = [
  [50, false, false],
  [50.01, true, false],
  [70, true, false],
  [70.01, true, true],
];

for (const [score, passedToClient, paymentQualified] of cases) {
  const result = classifyProjectScore(score);
  if (result.passedToClient !== passedToClient || result.paymentQualified !== paymentQualified) {
    throw new Error(`Threshold assertion failed for ${score}: ${JSON.stringify(result)}`);
  }
}

const fallback = classifyProjectScore(100, "local_fallback");
if (!fallback.passedToClient || !fallback.paymentQualified) throw new Error("Fallback reviewer should qualify submissions in local/demo mode.");
console.log(JSON.stringify(cases.map(([score]) => ({ score, ...classifyProjectScore(score) }))));
