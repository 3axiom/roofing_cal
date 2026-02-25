/**
 * Main app controller — ties together map, solar, and calculator modules.
 */
(async () => {
  // State
  let currentStep = 1;
  let roofData = null;
  let selectedMaterial = null;

  // Load config and pricing
  const configRes = await fetch("/api/config");
  const config = await configRes.json();
  const pricing = await RoofCalculator.loadPricing();

  // Translations
  const lang = pricing.language || "en";
  const t = (typeof RoofTranslations !== "undefined" && RoofTranslations[lang]) || RoofTranslations.en;

  // Apply translations to static UI
  function applyTranslations() {
    document.getElementById("rc-company-name").textContent =
      pricing.companyName + " — " + t.title;
    document.querySelector(".rc-subtitle").textContent = t.subtitle;

    // Step labels
    const stepLabels = document.querySelectorAll(".rc-step-label");
    if (stepLabels[0]) stepLabels[0].textContent = t.step1;
    if (stepLabels[1]) stepLabels[1].textContent = t.step2;
    if (stepLabels[2]) stepLabels[2].textContent = t.step3;
    if (stepLabels[3]) stepLabels[3].textContent = t.step4;

    // Step 1
    document.querySelector("#step-1 h2").textContent = t.findYourHome;
    document.querySelector("#step-1 > p").textContent = t.findYourHomeDesc;
    document.getElementById("rc-address-input").placeholder = t.addressPlaceholder;
    const searchBtn = document.getElementById("rc-search-btn");
    searchBtn.lastChild.textContent = " " + t.search;
    document.querySelector(".rc-help-text").textContent = t.isThisYourHome;
    const confirmBtn = document.getElementById("rc-confirm-location");
    confirmBtn.lastChild.textContent = " " + t.confirmLocation;

    // Step 2
    document.querySelector("#step-2 h2").textContent = t.yourRoofDetails;
    document.querySelector("#rc-loading-solar p").textContent = t.analyzingRoof;
    const detailLabels = document.querySelectorAll(".rc-detail-label");
    if (detailLabels[0]) detailLabels[0].textContent = t.roofArea;
    if (detailLabels[1]) detailLabels[1].textContent = t.roofSegments;
    if (detailLabels[2]) detailLabels[2].textContent = t.avgPitch;
    const detailUnits = document.querySelectorAll(".rc-detail-unit");
    if (detailUnits[0]) detailUnits[0].textContent = t.sqFt;
    if (detailUnits[1]) detailUnits[1].textContent = t.panels;
    if (detailUnits[2]) detailUnits[2].textContent = t.degrees;

    // Stories label
    const storiesLabel = document.querySelector('label[for="rc-stories"]');
    if (storiesLabel) storiesLabel.textContent = t.numStories;

    // Area correct question
    const areaLabel = document.querySelector('#rc-roof-details > .rc-field:nth-child(3) > label');
    if (areaLabel) areaLabel.textContent = t.areaCorrect;
    const radioLabels = document.querySelectorAll(".rc-radio-label");
    if (radioLabels[0]) radioLabels[0].lastChild.textContent = " " + t.yesLooksRight;
    if (radioLabels[1]) radioLabels[1].lastChild.textContent = " " + t.noLetMeAdjust;

    // Manual area
    const customAreaLabel = document.querySelector('label[for="rc-custom-area"]');
    if (customAreaLabel) customAreaLabel.textContent = t.enterRoofArea;

    // Buttons step 2
    document.getElementById("rc-step2-next").textContent = t.continue;
    document.getElementById("rc-step2-back").textContent = t.back;

    // Error fallback
    document.querySelector("#rc-solar-error > p").textContent = t.couldNotDetect;
    const fallbackAreaLabel = document.querySelector('label[for="rc-fallback-area"]');
    if (fallbackAreaLabel) fallbackAreaLabel.textContent = t.estRoofArea;
    const fallbackPitchLabel = document.querySelector('label[for="rc-fallback-pitch"]');
    if (fallbackPitchLabel) fallbackPitchLabel.textContent = t.roofPitch;
    const fallbackStoriesLabel = document.querySelector('label[for="rc-fallback-stories"]');
    if (fallbackStoriesLabel) fallbackStoriesLabel.textContent = t.numStories;
    document.getElementById("rc-fallback-next").textContent = t.continue;
    document.getElementById("rc-fallback-back").textContent = t.back;

    // Step 3
    document.querySelector("#step-3 h2").textContent = t.chooseOptions;
    const step3Labels = document.querySelectorAll("#step-3 .rc-field > label");
    if (step3Labels[0]) step3Labels[0].textContent = t.roofingMaterial;
    if (step3Labels[1]) step3Labels[1].textContent = t.additionalOptions;
    const step3Next = document.getElementById("rc-step3-next");
    step3Next.lastChild.textContent = " " + t.getMyEstimate;
    document.getElementById("rc-step3-back").textContent = t.back;

    // Step 4
    document.querySelector("#step-4 h2").textContent = t.yourEstimate;
    document.querySelector(".rc-estimate-label").textContent = t.estimatedCost;
    document.querySelector(".rc-lead-form h3").textContent = t.getDetailedQuote;
    document.querySelector(".rc-lead-form p").textContent = t.getDetailedQuoteDesc;
    document.getElementById("rc-lead-name").placeholder = t.fullName;
    document.getElementById("rc-lead-email").placeholder = t.emailAddress;
    document.getElementById("rc-lead-phone").placeholder = t.phoneNumber;
    document.getElementById("rc-lead-notes").placeholder = t.additionalNotes;
    const submitBtn = document.getElementById("rc-submit-lead");
    submitBtn.lastChild.textContent = " " + t.requestQuote;
    document.querySelector("#rc-lead-success h3").textContent = t.thankYou;
    document.querySelector("#rc-lead-success p").textContent = t.thankYouMsg;
    const startOverBtn = document.getElementById("rc-start-over");
    startOverBtn.lastChild.textContent = " " + t.startOver;
  }

  applyTranslations();

  // Init Google Maps
  try {
    await RoofMap.init(config.googleApiKey);
  } catch (err) {
    console.error("Maps init failed:", err);
    document.getElementById("rc-map").innerHTML =
      `<p style="padding:20px;text-align:center;color:#43474e;">${t.couldNotLoadMaps}</p>`;
  }

  // Populate dropdowns and options from pricing config
  populateStories();
  populatePitchDropdowns();
  populateMaterials();
  populateExtras();

  // --- Navigation ---
  function goToStep(step) {
    document.querySelectorAll(".rc-panel").forEach((p) => p.classList.remove("active"));
    document.getElementById(`step-${step}`).classList.add("active");

    document.querySelectorAll(".rc-step").forEach((s) => {
      const sNum = parseInt(s.dataset.step);
      s.classList.remove("active", "completed");
      if (sNum === step) s.classList.add("active");
      else if (sNum < step) s.classList.add("completed");
    });

    currentStep = step;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- Step 1: Confirm location ---
  document.getElementById("rc-confirm-location").addEventListener("click", async () => {
    const loc = RoofMap.getSelectedLocation();
    if (!loc) return alert(t.selectLocation);
    goToStep(2);
    await fetchSolarData(loc);
  });

  // --- Step 2: Fetch solar / roof data ---
  async function fetchSolarData(loc) {
    const loadingEl = document.getElementById("rc-loading-solar");
    const detailsEl = document.getElementById("rc-roof-details");
    const errorEl = document.getElementById("rc-solar-error");

    loadingEl.classList.remove("hidden");
    detailsEl.classList.add("hidden");
    errorEl.classList.add("hidden");

    try {
      roofData = await RoofSolar.fetchRoofData(loc.lat, loc.lng);

      document.getElementById("rc-roof-area").textContent =
        roofData.totalAreaSqFt.toLocaleString();
      document.getElementById("rc-roof-segments").textContent = roofData.segmentCount;
      document.getElementById("rc-roof-pitch").textContent =
        `${roofData.avgPitchDegrees}° (${roofData.pitchRatio}/12)`;

      loadingEl.classList.add("hidden");
      detailsEl.classList.remove("hidden");
    } catch (err) {
      console.error("Solar API error:", err);
      loadingEl.classList.add("hidden");
      errorEl.classList.remove("hidden");
    }
  }

  // Area correction toggle
  document.querySelectorAll('input[name="rc-area-correct"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const manualEl = document.getElementById("rc-manual-area");
      const noRadio = document.querySelector('input[name="rc-area-correct"][value="no"]');
      if (noRadio && noRadio.checked) {
        manualEl.classList.remove("hidden");
        document.getElementById("rc-custom-area").value = roofData?.totalAreaSqFt || "";
      } else {
        manualEl.classList.add("hidden");
      }
    });
  });

  // Step 2 continue (normal flow)
  document.getElementById("rc-step2-next").addEventListener("click", () => {
    const noRadio = document.querySelector('input[name="rc-area-correct"][value="no"]');
    if (noRadio && noRadio.checked) {
      const customArea = parseInt(document.getElementById("rc-custom-area").value);
      if (!customArea || customArea < 100) return alert(t.validRoofArea);
      roofData.totalAreaSqFt = customArea;
    }
    roofData.stories = document.getElementById("rc-stories").value;
    goToStep(3);
  });

  document.getElementById("rc-step2-back").addEventListener("click", () => goToStep(1));

  // Step 2 continue (fallback / error flow)
  document.getElementById("rc-fallback-next").addEventListener("click", () => {
    const area = parseInt(document.getElementById("rc-fallback-area").value);
    if (!area || area < 100) return alert(t.validRoofArea);
    const pitchSelect = document.getElementById("rc-fallback-pitch");
    const pitchRatio = parseInt(pitchSelect.value);
    const stories = document.getElementById("rc-fallback-stories").value;

    roofData = {
      totalAreaSqFt: area,
      segmentCount: 0,
      avgPitchDegrees: Math.round(Math.atan(pitchRatio / 12) * (180 / Math.PI)),
      pitchRatio,
      stories,
      segments: [],
    };
    goToStep(3);
  });

  document.getElementById("rc-fallback-back").addEventListener("click", () => goToStep(1));

  // --- Step 3 ---
  document.getElementById("rc-step3-next").addEventListener("click", () => {
    if (!selectedMaterial) return alert(t.selectMaterial);
    calculateEstimate();
    goToStep(4);
  });

  document.getElementById("rc-step3-back").addEventListener("click", () => goToStep(2));

  // --- Step 4 ---
  document.getElementById("rc-submit-lead").addEventListener("click", submitLead);
  document.getElementById("rc-start-over").addEventListener("click", () => {
    roofData = null;
    selectedMaterial = null;
    document.getElementById("rc-lead-success").classList.add("hidden");
    document.querySelector(".rc-lead-form").classList.remove("hidden");
    goToStep(1);
  });

  // --- Populate functions ---
  function populateStories() {
    const options = Object.entries(pricing.stories)
      .map(([key, val]) => `<option value="${key}">${val.label}</option>`)
      .join("");
    document.getElementById("rc-stories").innerHTML = options;
    const fb = document.getElementById("rc-fallback-stories");
    if (fb) fb.innerHTML = options;
  }

  function populatePitchDropdowns() {
    const options = Object.entries(pricing.pitchMultipliers)
      .map(([key, val]) => `<option value="${val.min}">${val.label}</option>`)
      .join("");
    const fb = document.getElementById("rc-fallback-pitch");
    if (fb) fb.innerHTML = options;
  }

  function populateMaterials() {
    const container = document.getElementById("rc-materials");
    container.innerHTML = pricing.materials
      .map(
        (m) => `
      <div class="rc-material-card" data-id="${m.id}">
        <div class="rc-material-name">${m.name}</div>
        <div class="rc-material-price">$${m.pricePerSqFt.toFixed(2)} ${t.perSqFt}</div>
        <div class="rc-material-desc">${m.description}</div>
      </div>
    `
      )
      .join("");

    // Click to select
    container.querySelectorAll(".rc-material-card").forEach((card) => {
      card.addEventListener("click", () => {
        container.querySelectorAll(".rc-material-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedMaterial = card.dataset.id;
      });
    });

    // Default to first
    const first = container.querySelector(".rc-material-card");
    if (first) {
      first.classList.add("selected");
      selectedMaterial = first.dataset.id;
    }
  }

  function populateExtras() {
    const container = document.getElementById("rc-extras");
    container.innerHTML = pricing.extras
      .map((e) => {
        let priceLabel = "";
        if (e.flatPrice) priceLabel = `$${e.flatPrice}`;
        else if (e.pricePerSqFt) priceLabel = `$${e.pricePerSqFt.toFixed(2)}/sq ft`;
        else if (e.pricePerLinFt) priceLabel = `$${e.pricePerLinFt.toFixed(2)}/lin ft`;

        return `
        <label class="rc-extra-item">
          <input type="checkbox" value="${e.id}">
          <div class="rc-extra-info">
            <div class="rc-extra-name">${e.name}</div>
            <div class="rc-extra-price">${priceLabel}</div>
          </div>
        </label>
      `;
      })
      .join("");
  }

  // --- Calculate ---
  function calculateEstimate() {
    const extraIds = Array.from(
      document.querySelectorAll('#rc-extras input[type="checkbox"]')
    ).filter((cb) => cb.checked).map((cb) => cb.value);

    const estimate = RoofCalculator.calculate({
      roofAreaSqFt: roofData.totalAreaSqFt,
      pitchRatio: roofData.pitchRatio,
      materialId: selectedMaterial,
      stories: roofData.stories || "1",
      extraIds,
    });

    // Display total
    document.getElementById("rc-estimate-total").textContent =
      "$" + estimate.total.toLocaleString();

    // Display breakdown
    const breakdownEl = document.getElementById("rc-breakdown");
    breakdownEl.innerHTML =
      estimate.breakdown
        .map(
          (row) => `
        <div class="rc-breakdown-row">
          <span>${row.label} <small>${row.detail}</small></span>
          <span>$${row.amount.toLocaleString()}</span>
        </div>
      `
        )
        .join("") +
      `<div class="rc-breakdown-row total">
        <span>${t.totalEstimate}</span>
        <span>$${estimate.total.toLocaleString()}</span>
      </div>`;

    // Disclaimer
    document.getElementById("rc-disclaimer").textContent = estimate.disclaimer;
    document.getElementById("rc-company-phone-display").textContent =
      `${t.callUs} ${pricing.companyPhone}`;
  }

  // --- Lead submission ---
  async function submitLead() {
    const name = document.getElementById("rc-lead-name").value.trim();
    const email = document.getElementById("rc-lead-email").value.trim();
    const phone = document.getElementById("rc-lead-phone").value.trim();
    const notes = document.getElementById("rc-lead-notes").value.trim();

    if (!name || !email || !phone) {
      return alert(t.fillRequired);
    }

    const leadData = {
      name,
      email,
      phone,
      notes,
      address: RoofMap.getSelectedAddress(),
      roofAreaSqFt: roofData.totalAreaSqFt,
      pitchRatio: roofData.pitchRatio,
      material: selectedMaterial,
      estimateTotal: parseInt(
        document.getElementById("rc-estimate-total").textContent.replace(/[$,]/g, "")
      ),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
      const data = await res.json();
      if (data.success) {
        document.querySelector(".rc-lead-form").classList.add("hidden");
        document.getElementById("rc-lead-success").classList.remove("hidden");
      }
    } catch (err) {
      alert(t.somethingWrong);
    }
  }
})();
