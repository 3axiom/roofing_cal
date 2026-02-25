/**
 * Estimate calculator — takes roof data + user selections and computes cost.
 */
const RoofCalculator = (() => {
  let pricing = null;

  async function loadPricing() {
    const res = await fetch("/api/pricing");
    pricing = await res.json();
    return pricing;
  }

  function getPricing() {
    return pricing;
  }

  /**
   * Determine the pitch multiplier bracket for a given pitch ratio (x/12).
   */
  function getPitchMultiplier(pitchRatio) {
    if (!pricing) return 1;
    const brackets = pricing.pitchMultipliers;
    for (const key of Object.keys(brackets)) {
      const b = brackets[key];
      if (pitchRatio >= b.min && pitchRatio <= b.max) {
        return b.multiplier;
      }
    }
    // Default to medium if out of range
    return brackets.medium?.multiplier || 1.15;
  }

  /**
   * Calculate the full estimate.
   *
   * @param {Object} params
   * @param {number} params.roofAreaSqFt   Total roof area
   * @param {number} params.pitchRatio     Pitch as x/12
   * @param {string} params.materialId     Selected material id
   * @param {string} params.stories        "1", "2", or "3"
   * @param {string[]} params.extraIds     Array of selected extra ids
   * @returns {Object} Estimate breakdown
   */
  function calculate({ roofAreaSqFt, pitchRatio, materialId, stories, extraIds }) {
    if (!pricing) throw new Error("Pricing not loaded");

    const breakdown = [];
    let total = 0;

    // Apply waste factor to area
    const adjustedArea = roofAreaSqFt * (pricing.wasteFactor || 1.10);

    // 1. Material cost
    const material = pricing.materials.find((m) => m.id === materialId);
    const materialCost = adjustedArea * material.pricePerSqFt;
    breakdown.push({
      label: material.name,
      detail: `${Math.round(adjustedArea)} sq ft x $${material.pricePerSqFt.toFixed(2)}`,
      amount: materialCost,
    });
    total += materialCost;

    // 2. Pitch multiplier
    const pitchMult = getPitchMultiplier(pitchRatio);
    if (pitchMult > 1) {
      const pitchExtra = total * (pitchMult - 1);
      const bracket = Object.values(pricing.pitchMultipliers).find(
        (b) => pitchRatio >= b.min && pitchRatio <= b.max
      );
      breakdown.push({
        label: `Pitch adjustment (${bracket?.label || pitchRatio + "/12"})`,
        detail: `${Math.round((pitchMult - 1) * 100)}% surcharge`,
        amount: pitchExtra,
      });
      total += pitchExtra;
    }

    // 3. Story multiplier
    const storyConfig = pricing.stories[stories] || pricing.stories["1"];
    if (storyConfig.multiplier > 1) {
      const storyExtra = total * (storyConfig.multiplier - 1);
      breakdown.push({
        label: `${storyConfig.label} adjustment`,
        detail: `${Math.round((storyConfig.multiplier - 1) * 100)}% surcharge`,
        amount: storyExtra,
      });
      total += storyExtra;
    }

    // 4. Extras
    const selectedExtras = pricing.extras.filter((e) => extraIds.includes(e.id));
    selectedExtras.forEach((extra) => {
      let cost = 0;
      let detail = "";
      if (extra.flatPrice) {
        cost = extra.flatPrice;
        detail = "Flat rate";
      } else if (extra.pricePerSqFt) {
        cost = adjustedArea * extra.pricePerSqFt;
        detail = `${Math.round(adjustedArea)} sq ft x $${extra.pricePerSqFt.toFixed(2)}`;
      } else if (extra.pricePerLinFt) {
        // Estimate perimeter from area (rough square approximation)
        const estPerimeter = Math.sqrt(roofAreaSqFt) * 4;
        cost = estPerimeter * extra.pricePerLinFt;
        detail = `~${Math.round(estPerimeter)} lin ft x $${extra.pricePerLinFt.toFixed(2)}`;
      }
      breakdown.push({ label: extra.name, detail, amount: cost });
      total += cost;
    });

    // Enforce minimum
    if (total < pricing.minimumJobPrice) {
      total = pricing.minimumJobPrice;
    }

    return {
      total: Math.round(total),
      breakdown: breakdown.map((row) => ({
        ...row,
        amount: Math.round(row.amount),
      })),
      adjustedAreaSqFt: Math.round(adjustedArea),
      disclaimer: pricing.disclaimer,
    };
  }

  return { loadPricing, getPricing, calculate };
})();
