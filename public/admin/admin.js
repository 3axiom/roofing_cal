/**
 * Admin page — load and save pricing configuration.
 */
(async () => {
  let pricing = {};

  async function loadPricing() {
    const res = await fetch("/api/pricing");
    pricing = await res.json();
    render();
  }

  function render() {
    // Company info
    document.getElementById("admin-company-name").value = pricing.companyName || "";
    document.getElementById("admin-company-phone").value = pricing.companyPhone || "";
    document.getElementById("admin-min-price").value = pricing.minimumJobPrice || 3500;
    document.getElementById("admin-waste").value = pricing.wasteFactor || 1.1;
    document.getElementById("admin-disclaimer").value = pricing.disclaimer || "";

    // Materials
    renderMaterials();
    renderPitch();
    renderStories();
    renderTearOff();
    renderExtras();
  }

  function renderMaterials() {
    const tbody = document.getElementById("admin-materials");
    tbody.innerHTML = pricing.materials
      .map(
        (m, i) => `
      <tr data-index="${i}">
        <td><input type="text" value="${m.name}" data-field="name"></td>
        <td><input type="number" value="${m.pricePerSqFt}" step="0.25" data-field="pricePerSqFt"></td>
        <td><input type="text" value="${m.description}" data-field="description"></td>
        <td><button class="btn-remove" data-remove-material="${i}">&times;</button></td>
      </tr>
    `
      )
      .join("");

    // Bind remove buttons
    tbody.querySelectorAll("[data-remove-material]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pricing.materials.splice(parseInt(btn.dataset.removeMaterial), 1);
        renderMaterials();
      });
    });
  }

  function renderPitch() {
    const tbody = document.getElementById("admin-pitch");
    tbody.innerHTML = Object.entries(pricing.pitchMultipliers)
      .map(
        ([key, val]) => `
      <tr data-pitch-key="${key}">
        <td><input type="text" value="${val.label}" data-field="label"></td>
        <td><input type="number" value="${val.min}" data-field="min"></td>
        <td><input type="number" value="${val.max}" data-field="max"></td>
        <td><input type="number" value="${val.multiplier}" step="0.05" data-field="multiplier"></td>
      </tr>
    `
      )
      .join("");
  }

  function renderStories() {
    const tbody = document.getElementById("admin-stories");
    tbody.innerHTML = Object.entries(pricing.stories)
      .map(
        ([key, val]) => `
      <tr data-story-key="${key}">
        <td>${key}</td>
        <td><input type="text" value="${val.label}" data-field="label"></td>
        <td><input type="number" value="${val.multiplier}" step="0.05" data-field="multiplier"></td>
      </tr>
    `
      )
      .join("");
  }

  function renderTearOff() {
    const tbody = document.getElementById("admin-tearoff");
    tbody.innerHTML = Object.entries(pricing.tearOff)
      .map(
        ([key, val]) => `
      <tr data-tearoff-key="${key}">
        <td>${key}</td>
        <td><input type="text" value="${val.label}" data-field="label"></td>
        <td><input type="number" value="${val.pricePerSqFt}" step="0.25" data-field="pricePerSqFt"></td>
      </tr>
    `
      )
      .join("");
  }

  function renderExtras() {
    const tbody = document.getElementById("admin-extras");
    tbody.innerHTML = pricing.extras
      .map(
        (e, i) => `
      <tr data-extra-index="${i}">
        <td><input type="text" value="${e.name}" data-field="name"></td>
        <td><input type="number" value="${e.flatPrice || ""}" step="25" data-field="flatPrice"></td>
        <td><input type="number" value="${e.pricePerSqFt || ""}" step="0.25" data-field="pricePerSqFt"></td>
        <td><input type="number" value="${e.pricePerLinFt || ""}" step="0.50" data-field="pricePerLinFt"></td>
        <td><button class="btn-remove" data-remove-extra="${i}">&times;</button></td>
      </tr>
    `
      )
      .join("");

    tbody.querySelectorAll("[data-remove-extra]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pricing.extras.splice(parseInt(btn.dataset.removeExtra), 1);
        renderExtras();
      });
    });
  }

  // Add material
  document.getElementById("admin-add-material").addEventListener("click", () => {
    const id = "material_" + Date.now();
    pricing.materials.push({
      id,
      name: "New Material",
      pricePerSqFt: 0,
      description: "",
    });
    renderMaterials();
  });

  // Add extra
  document.getElementById("admin-add-extra").addEventListener("click", () => {
    const id = "extra_" + Date.now();
    pricing.extras.push({ id, name: "New Add-on", flatPrice: 0 });
    renderExtras();
  });

  // Save
  document.getElementById("admin-save").addEventListener("click", async () => {
    // Collect values from DOM
    pricing.companyName = document.getElementById("admin-company-name").value;
    pricing.companyPhone = document.getElementById("admin-company-phone").value;
    pricing.minimumJobPrice = parseFloat(document.getElementById("admin-min-price").value);
    pricing.wasteFactor = parseFloat(document.getElementById("admin-waste").value);
    pricing.disclaimer = document.getElementById("admin-disclaimer").value;

    // Materials
    document.querySelectorAll("#admin-materials tr").forEach((row, i) => {
      if (pricing.materials[i]) {
        pricing.materials[i].name = row.querySelector('[data-field="name"]').value;
        pricing.materials[i].pricePerSqFt = parseFloat(
          row.querySelector('[data-field="pricePerSqFt"]').value
        );
        pricing.materials[i].description = row.querySelector('[data-field="description"]').value;
      }
    });

    // Pitch
    document.querySelectorAll("#admin-pitch tr").forEach((row) => {
      const key = row.dataset.pitchKey;
      if (pricing.pitchMultipliers[key]) {
        pricing.pitchMultipliers[key].label = row.querySelector('[data-field="label"]').value;
        pricing.pitchMultipliers[key].min = parseInt(row.querySelector('[data-field="min"]').value);
        pricing.pitchMultipliers[key].max = parseInt(row.querySelector('[data-field="max"]').value);
        pricing.pitchMultipliers[key].multiplier = parseFloat(
          row.querySelector('[data-field="multiplier"]').value
        );
      }
    });

    // Stories
    document.querySelectorAll("#admin-stories tr").forEach((row) => {
      const key = row.dataset.storyKey;
      if (pricing.stories[key]) {
        pricing.stories[key].label = row.querySelector('[data-field="label"]').value;
        pricing.stories[key].multiplier = parseFloat(
          row.querySelector('[data-field="multiplier"]').value
        );
      }
    });

    // Tear-off
    document.querySelectorAll("#admin-tearoff tr").forEach((row) => {
      const key = row.dataset.tearoffKey;
      if (pricing.tearOff[key]) {
        pricing.tearOff[key].label = row.querySelector('[data-field="label"]').value;
        pricing.tearOff[key].pricePerSqFt = parseFloat(
          row.querySelector('[data-field="pricePerSqFt"]').value
        );
      }
    });

    // Extras
    document.querySelectorAll("#admin-extras tr").forEach((row, i) => {
      if (pricing.extras[i]) {
        pricing.extras[i].name = row.querySelector('[data-field="name"]').value;
        const flat = row.querySelector('[data-field="flatPrice"]').value;
        const sqft = row.querySelector('[data-field="pricePerSqFt"]').value;
        const linft = row.querySelector('[data-field="pricePerLinFt"]').value;
        pricing.extras[i].flatPrice = flat ? parseFloat(flat) : undefined;
        pricing.extras[i].pricePerSqFt = sqft ? parseFloat(sqft) : undefined;
        pricing.extras[i].pricePerLinFt = linft ? parseFloat(linft) : undefined;
      }
    });

    try {
      const res = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });
      const data = await res.json();
      showMsg(data.success ? "Pricing saved successfully!" : "Error saving.", data.success);
    } catch (err) {
      showMsg("Failed to save. " + err.message, false);
    }
  });

  function showMsg(text, success) {
    const el = document.getElementById("admin-msg");
    el.textContent = text;
    el.className = "admin-msg " + (success ? "success" : "error");
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 4000);
  }

  await loadPricing();
})();
