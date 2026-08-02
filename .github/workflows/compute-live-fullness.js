#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const LAKE_LEVEL_PATH = path.join(REPO_ROOT, "assets", "data", "LakeLevel.csv");
const OUTPUT_PATH = path.join(REPO_ROOT, "assets", "data", "travis-live.json");

const DEAD_POOL_CAPACITY = 17032;
const CONSERVATION_CAPACITY = 1098044;
const LAKE_NAME = "Travis";

function parseLakeLevelCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("LakeLevel.csv does not contain enough content to parse.");
  }

  const travisRow = lines.slice(1).find((line) => {
    const columns = line.split(",");
    return columns[1] === LAKE_NAME;
  });

  if (!travisRow) {
    throw new Error("Could not find the Lake Travis row in LakeLevel.csv.");
  }

  const columns = travisRow.split(",");
  const readDate = columns[2]?.trim() ?? "";
  const currentLevel = Number.parseFloat(columns[3]);
  const currentStorage = Number.parseFloat(columns[5]);

  if (!Number.isFinite(currentLevel)) {
    throw new Error(
      "Lake Travis current level could not be parsed from LakeLevel.csv.",
    );
  }

  return {
    currentLevel,
    currentStorage,
    readDate,
  };
}

function calculateFullnessFromStorage(storage) {
  const percent =
    ((storage - DEAD_POOL_CAPACITY) / CONSERVATION_CAPACITY) * 100;

  return Math.max(0, Math.min(100, percent));
}

function writeSnapshot({ currentLevel, fullnessPercent, readDate }) {
  const outputText = [
    "{",
    `  "lakeLevel": ${currentLevel.toFixed(2)},`,
    `  "fullnessPercent": ${fullnessPercent.toFixed(2)},`,
    `  "readDate": "${readDate}"`,
    "}",
    "",
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, outputText);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(outputText.trim());
}

function main() {
  const lakeLevelText = fs.readFileSync(LAKE_LEVEL_PATH, "utf8");

  const { currentLevel, currentStorage, readDate } =
    parseLakeLevelCsv(lakeLevelText);

  if (!Number.isFinite(currentStorage)) {
    throw new Error(
      "Lake Travis current storage could not be parsed from LakeLevel.csv.",
    );
  }

  const fullnessPercent = calculateFullnessFromStorage(currentStorage);

  writeSnapshot({
    currentLevel,
    fullnessPercent,
    readDate,
  });
}

if (require.main === module) {
  main();
}
