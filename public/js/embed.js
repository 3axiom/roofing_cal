/**
 * Embeddable widget loader.
 *
 * Usage on any external site:
 *
 *   <div id="roofing-calculator-widget"></div>
 *   <script src="https://your-domain.com/js/embed.js"
 *           data-server="https://your-domain.com"></script>
 *
 * This script injects an iframe pointing at the hosted calculator.
 */
(function () {
  const script = document.currentScript;
  const server = script.getAttribute("data-server") || "";
  const containerId = script.getAttribute("data-container") || "roofing-calculator-widget";
  const width = script.getAttribute("data-width") || "100%";
  const height = script.getAttribute("data-height") || "800px";

  function inject() {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("Roofing Calculator: container #" + containerId + " not found.");
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = server + "/";
    iframe.style.width = width;
    iframe.style.height = height;
    iframe.style.border = "none";
    iframe.style.borderRadius = "8px";
    iframe.style.overflow = "hidden";
    iframe.setAttribute("title", "Roofing Cost Calculator");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allow", "geolocation");

    container.appendChild(iframe);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
