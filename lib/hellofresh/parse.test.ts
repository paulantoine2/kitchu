import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { matchHelloFreshRecipe } from "./match";
import { htmlInstructionsToText, parseHelloFreshRecipe, parseIsoDurationMinutes } from "./parse";
import type { HelloFreshRecipe } from "./types";
import { helloFreshUnitToCode } from "./units";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const sampleRecipe = JSON.parse(
  readFileSync(join(fixtureDir, "fixtures/porc-dore-recipe.json"), "utf8"),
) as HelloFreshRecipe;

describe("helloFreshUnitToCode", () => {
  it("maps common HelloFresh units", () => {
    assert.equal(helloFreshUnitToCode("g"), "g");
    assert.equal(helloFreshUnitToCode("pièce(s)"), "piece");
    assert.equal(helloFreshUnitToCode("sachet(s)"), "sachet");
    assert.equal(helloFreshUnitToCode("cs"), "cas");
    assert.equal(helloFreshUnitToCode("selon le goût"), null);
  });
});

describe("parseHelloFreshRecipe", () => {
  it("parses the sample recipe for 1 serving", () => {
    const parsed = parseHelloFreshRecipe(
      sampleRecipe,
      "https://www.hellofresh.fr/recipes/porc-dore-and-reduction-fraise-balsamique-672890c2d49f300fd61630ab",
      1,
    );

    assert.equal(parsed.name, "Porc doré & réduction fraise balsamique");
    assert.equal(parsed.description, "avec des légumes rissolés au romarin");
    assert.equal(parsed.servings, 1);
    assert.equal(parsed.ingredients.length, 12);
    assert.equal(parsed.steps.length, 6);
    assert.match(parsed.imageUrl, /hellofresh_s3/);

    const potatoes = parsed.ingredients.find((item) => item.name === "Pommes de terre");
    assert.ok(potatoes);
    assert.equal(potatoes.amount, 250);
    assert.equal(potatoes.unitCode, "g");
    assert.match(potatoes.imageUrl, /hellofresh_s3\/ingredient\//);
  });
});

describe("htmlInstructionsToText", () => {
  it("strips HTML lists", () => {
    const text = htmlInstructionsToText(
      "<ul><li>Préchauffez le four.</li><li>Coupez les pommes de terre.</li></ul>",
    );
    assert.match(text, /Préchauffez le four/);
    assert.match(text, /Coupez les pommes de terre/);
  });
});

describe("parseIsoDurationMinutes", () => {
  it("reads PT durations", () => {
    assert.equal(parseIsoDurationMinutes("PT45M"), 45);
    assert.equal(parseIsoDurationMinutes("PT1H30M"), 90);
  });
});

describe("matchHelloFreshRecipe", () => {
  it("flags missing ingredients and units", () => {
    const parsed = parseHelloFreshRecipe(sampleRecipe, "https://example.com/recipe", 1);
    const units = [
      { id: "u-g", code: "g", symbol: "g" },
      { id: "u-piece", code: "piece", symbol: "pièce" },
      { id: "u-sachet", code: "sachet", symbol: "sachet" },
    ];
    const ingredients = [
      {
        id: "i-potato",
        name: "Pommes de terre",
        units: [{ unitId: "u-g", unit: units[0] }],
      },
    ];

    const result = matchHelloFreshRecipe(parsed, ingredients, units);
    const potato = result.matches.find((item) => item.name === "Pommes de terre");
    const rosemary = result.matches.find((item) => item.name === "Romarin séché");

    assert.equal(potato?.status, "matched");
    assert.equal(rosemary?.status, "ingredient_missing");
  });
});
