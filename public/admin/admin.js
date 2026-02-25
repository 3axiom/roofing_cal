/**
 * Admin Dashboard — Authentication, Pricing, Leads Management
 */
(async () => {
  let pricing = {};
  let leads = [];

  // --- DOM refs ---
  const loginScreen = document.getElementById("login-screen");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");

  // --- Auth ---
  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/check");
      const data = await res.json();
      if (data.authenticated) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  }

  function showLogin() {
    loginScreen.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }

  function showDashboard() {
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadPricing();
    loadLeads();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");

    const username = document.getElementById("login-user").value;
    const password = document.getElementById("login-pass").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        showDashboard();
      } else {
        const data = await res.json();
        loginError.textContent = data.error || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch {
      loginError.textContent = "Connection error. Please try again.";
      loginError.classList.remove("hidden");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    showLogin();
  });

  // --- Tab Navigation ---
  document.querySelectorAll(".nav-item[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item[data-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");

      // Close mobile menu
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  // Mobile menu
  document.getElementById("mobile-menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // --- Leads ---
  async function loadLeads() {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        leads = await res.json();
      } else {
        leads = [];
      }
    } catch {
      leads = [];
    }
    renderLeads();
    renderStats();
  }

  function renderStats() {
    const total = leads.length;
    const totalEstimate = leads.reduce((sum, l) => sum + (l.estimateTotal || 0), 0);
    const thisMonth = leads.filter((l) => {
      const d = new Date(l.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    document.getElementById("leads-stats").innerHTML = `
      <div class="stat-card primary">
        <span class="stat-label">Total Leads</span>
        <span class="stat-value">${total}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">This Month</span>
        <span class="stat-value">${thisMonth}</span>
      </div>
      <div class="stat-card success">
        <span class="stat-label">Total Estimated</span>
        <span class="stat-value">$${totalEstimate.toLocaleString()}</span>
      </div>
    `;
  }

  function renderLeads(filter = "") {
    const tbody = document.getElementById("leads-body");
    const empty = document.getElementById("leads-empty");
    const search = filter.toLowerCase();

    const filtered = leads.filter((l) => {
      if (!search) return true;
      return (
        (l.name || "").toLowerCase().includes(search) ||
        (l.email || "").toLowerCase().includes(search) ||
        (l.address || "").toLowerCase().includes(search) ||
        (l.phone || "").toLowerCase().includes(search)
      );
    });

    if (filtered.length === 0) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    tbody.innerHTML = filtered
      .map(
        (l) => `
      <tr data-lead-id="${l.id}">
        <td class="lead-date">${formatDate(l.createdAt)}</td>
        <td class="lead-name">${esc(l.name || "\u2014")}</td>
        <td class="lead-contact">
          <div class="lead-email">${esc(l.email || "\u2014")}</div>
          <div class="lead-phone">${esc(l.phone || "\u2014")}</div>
        </td>
        <td class="lead-address" title="${esc(l.address || "")}">${esc(l.address || "\u2014")}</td>
        <td>${l.roofAreaSqFt ? l.roofAreaSqFt.toLocaleString() + " sq ft" : "\u2014"}</td>
        <td>${esc(l.material || "\u2014")}</td>
        <td class="lead-estimate">${l.estimateTotal ? "$" + l.estimateTotal.toLocaleString() : "\u2014"}</td>
        <td><button class="btn-view" data-view-lead="${l.id}">View</button></td>
      </tr>
    `
      )
      .join("");

    tbody.querySelectorAll("[data-view-lead]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openLeadModal(parseInt(btn.dataset.viewLead));
      });
    });

    tbody.querySelectorAll("tr[data-lead-id]").forEach((row) => {
      row.addEventListener("click", () => {
        openLeadModal(parseInt(row.dataset.leadId));
      });
    });
  }

  // Search
  document.getElementById("leads-search").addEventListener("input", (e) => {
    renderLeads(e.target.value);
  });

  // Lead modal
  function openLeadModal(id) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    const modal = document.getElementById("lead-modal");
    const body = document.getElementById("modal-body");

    body.innerHTML = `
      <div class="modal-field">
        <span class="modal-label">Estimated Total</span>
        <span class="modal-value modal-estimate">${lead.estimateTotal ? "$" + lead.estimateTotal.toLocaleString() : "\u2014"}</span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Name</span>
        <span class="modal-value">${esc(lead.name || "\u2014")}</span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Email</span>
        <span class="modal-value"><a href="mailto:${esc(lead.email || "")}">${esc(lead.email || "\u2014")}</a></span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Phone</span>
        <span class="modal-value"><a href="tel:${esc(lead.phone || "")}">${esc(lead.phone || "\u2014")}</a></span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Address</span>
        <span class="modal-value">${esc(lead.address || "\u2014")}</span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Roof Area</span>
        <span class="modal-value">${lead.roofAreaSqFt ? lead.roofAreaSqFt.toLocaleString() + " sq ft" : "\u2014"}</span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Pitch</span>
        <span class="modal-value">${lead.pitchRatio ? lead.pitchRatio + "/12" : "\u2014"}</span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Material</span>
        <span class="modal-value">${esc(lead.material || "\u2014")}</span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Notes</span>
        <span class="modal-value">${esc(lead.notes || "None")}</span>
      </div>
      <div class="modal-field">
        <span class="modal-label">Submitted</span>
        <span class="modal-value">${lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "\u2014"}</span>
      </div>
      <div class="modal-actions">
        ${lead.email ? `<a href="mailto:${esc(lead.email)}" class="btn-contact email">Email</a>` : ""}
        ${lead.phone ? `<a href="tel:${esc(lead.phone)}" class="btn-contact phone">Call</a>` : ""}
        <button class="btn-contact delete" data-delete-lead="${lead.id}">Delete</button>
      </div>
    `;

    const deleteBtn = body.querySelector("[data-delete-lead]");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this lead? This cannot be undone.")) return;
        try {
          await fetch("/api/leads/" + lead.id, { method: "DELETE" });
          modal.classList.add("hidden");
          await loadLeads();
        } catch (err) {
          alert("Failed to delete lead.");
        }
      });
    }

    modal.classList.remove("hidden");
  }

  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("lead-modal").classList.add("hidden");
  });

  document.getElementById("lead-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add("hidden");
    }
  });

  // --- Pricing ---
  async function loadPricing() {
    const res = await fetch("/api/pricing");
    pricing = await res.json();
    renderPricing();
  }

  function renderPricing() {
    // MD3 text fields — set value property
    setFieldValue("admin-company-name", pricing.companyName || "");
    setFieldValue("admin-company-phone", pricing.companyPhone || "");
    setFieldValue("admin-min-price", pricing.minimumJobPrice || 3500);
    setFieldValue("admin-waste", pricing.wasteFactor || 1.1);
    setFieldValue("admin-disclaimer", pricing.disclaimer || "");

    renderMaterials();
    renderPitch();
    renderStories();
    renderExtras();
  }

  // Helper to set value on both native inputs and MD3 text fields
  function setFieldValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function renderMaterials() {
    const tbody = document.getElementById("admin-materials");
    tbody.innerHTML = pricing.materials
      .map(
        (m, i) => `
      <tr data-index="${i}">
        <td><input type="text" value="${esc(m.name)}" data-field="name"></td>
        <td><input type="number" value="${m.pricePerSqFt}" step="0.25" data-field="pricePerSqFt"></td>
        <td><input type="text" value="${esc(m.description)}" data-field="description"></td>
        <td><button class="btn-remove" data-remove-material="${i}">&times;</button></td>
      </tr>
    `
      )
      .join("");

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
        <td><input type="text" value="${esc(val.label)}" data-field="label"></td>
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
        <td><input type="text" value="${esc(val.label)}" data-field="label"></td>
        <td><input type="number" value="${val.multiplier}" step="0.05" data-field="multiplier"></td>
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
        <td><input type="text" value="${esc(e.name)}" data-field="name"></td>
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
    pricing.materials.push({
      id: "material_" + Date.now(),
      name: "New Material",
      pricePerSqFt: 0,
      description: "",
    });
    renderMaterials();
  });

  // Add extra
  document.getElementById("admin-add-extra").addEventListener("click", () => {
    pricing.extras.push({ id: "extra_" + Date.now(), name: "New Add-on", flatPrice: 0 });
    renderExtras();
  });

  // Collect pricing data from DOM
  function collectPricing() {
    pricing.companyName = document.getElementById("admin-company-name").value;
    pricing.companyPhone = document.getElementById("admin-company-phone").value;
    pricing.minimumJobPrice = parseFloat(document.getElementById("admin-min-price").value);
    pricing.wasteFactor = parseFloat(document.getElementById("admin-waste").value);
    pricing.disclaimer = document.getElementById("admin-disclaimer").value;

    document.querySelectorAll("#admin-materials tr").forEach((row, i) => {
      if (pricing.materials[i]) {
        pricing.materials[i].name = row.querySelector('[data-field="name"]').value;
        pricing.materials[i].pricePerSqFt = parseFloat(row.querySelector('[data-field="pricePerSqFt"]').value);
        pricing.materials[i].description = row.querySelector('[data-field="description"]').value;
      }
    });

    document.querySelectorAll("#admin-pitch tr").forEach((row) => {
      const key = row.dataset.pitchKey;
      if (pricing.pitchMultipliers[key]) {
        pricing.pitchMultipliers[key].label = row.querySelector('[data-field="label"]').value;
        pricing.pitchMultipliers[key].min = parseInt(row.querySelector('[data-field="min"]').value);
        pricing.pitchMultipliers[key].max = parseInt(row.querySelector('[data-field="max"]').value);
        pricing.pitchMultipliers[key].multiplier = parseFloat(row.querySelector('[data-field="multiplier"]').value);
      }
    });

    document.querySelectorAll("#admin-stories tr").forEach((row) => {
      const key = row.dataset.storyKey;
      if (pricing.stories[key]) {
        pricing.stories[key].label = row.querySelector('[data-field="label"]').value;
        pricing.stories[key].multiplier = parseFloat(row.querySelector('[data-field="multiplier"]').value);
      }
    });

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
  }

  // Save pricing
  document.getElementById("admin-save").addEventListener("click", async () => {
    collectPricing();
    await savePricing("pricing-msg");
  });

  // Save company info
  document.getElementById("company-save").addEventListener("click", async () => {
    pricing.companyName = document.getElementById("admin-company-name").value;
    pricing.companyPhone = document.getElementById("admin-company-phone").value;
    await savePricing("company-msg");
  });

  async function savePricing(msgId) {
    try {
      const res = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMsg(msgId, "Saved successfully!", true);
      } else {
        showMsg(msgId, data.error || "Error saving.", false);
      }
    } catch (err) {
      showMsg(msgId, "Failed to save. " + err.message, false);
    }
  }

  function showMsg(id, text, success) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = "dash-msg " + (success ? "success" : "error");
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 4000);
  }

  // --- Helpers ---
  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "\u2014";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // --- Init ---
  await checkAuth();
})();
