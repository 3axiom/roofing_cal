/**
 * Google Maps integration — address search, map display, marker placement.
 */
const RoofMap = (() => {
  let map = null;
  let marker = null;
  let autocomplete = null;
  let selectedLocation = null;
  let selectedAddress = "";

  function init(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        setupMap();
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=_rcMapsReady`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      window._rcMapsReady = () => {
        setupMap();
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  function setupMap() {
    const mapEl = document.getElementById("rc-map");

    map = new google.maps.Map(mapEl, {
      center: { lat: 39.8283, lng: -98.5795 }, // Center of US
      zoom: 5,
      mapTypeId: "hybrid",
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Click on map to adjust pin
    map.addListener("click", (e) => {
      placeMarker(e.latLng);
      reverseGeocode(e.latLng);
    });

    // Set up Places Autocomplete
    const input = document.getElementById("rc-address-input");
    autocomplete = new google.maps.places.Autocomplete(input, {
      types: ["address"],
      componentRestrictions: { country: "us" },
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      const loc = place.geometry.location;
      map.setCenter(loc);
      map.setZoom(19);
      placeMarker(loc);
      selectedAddress = place.formatted_address;
      showConfirm(selectedAddress);
    });

    // Search button
    document.getElementById("rc-search-btn").addEventListener("click", () => {
      const input = document.getElementById("rc-address-input");
      // Trigger autocomplete by simulating enter
      google.maps.event.trigger(autocomplete, "place_changed");
    });
  }

  function placeMarker(location) {
    if (marker) {
      marker.setPosition(location);
    } else {
      marker = new google.maps.Marker({
        position: location,
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });

      marker.addListener("dragend", (e) => {
        reverseGeocode(e.latLng);
      });
    }

    selectedLocation = {
      lat: location.lat(),
      lng: location.lng(),
    };
  }

  function reverseGeocode(latLng) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === "OK" && results[0]) {
        selectedAddress = results[0].formatted_address;
        selectedLocation = {
          lat: latLng.lat(),
          lng: latLng.lng(),
        };
        showConfirm(selectedAddress);
      }
    });
  }

  function showConfirm(address) {
    const confirmEl = document.getElementById("rc-map-confirm");
    const addressEl = document.getElementById("rc-selected-address");
    confirmEl.classList.remove("hidden");
    addressEl.textContent = address;
  }

  function getSelectedLocation() {
    return selectedLocation;
  }

  function getSelectedAddress() {
    return selectedAddress;
  }

  return { init, getSelectedLocation, getSelectedAddress };
})();
