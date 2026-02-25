/**
 * Google Solar API integration — fetch roof data (area, pitch, segments).
 */
const RoofSolar = (() => {

  async function fetchRoofData(lat, lng) {
    const response = await fetch(`/api/solar?lat=${lat}&lng=${lng}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Could not retrieve roof data");
    }

    return parseRoofData(data);
  }

  function parseRoofData(data) {
    const solarPotential = data.solarPotential;
    if (!solarPotential) {
      throw new Error("No solar/roof data available for this location");
    }

    const roofSegments = solarPotential.roofSegmentStats || [];

    // Total roof area in sq ft (API returns sq meters)
    const totalAreaM2 = solarPotential.wholeRoofStats?.areaMeters2
      || roofSegments.reduce((sum, seg) => sum + (seg.stats?.areaMeters2 || 0), 0);
    const totalAreaSqFt = Math.round(totalAreaM2 * 10.7639);

    // Calculate weighted average pitch from segments
    let totalWeightedPitch = 0;
    let totalSegArea = 0;

    roofSegments.forEach((seg) => {
      const area = seg.stats?.areaMeters2 || 0;
      const pitchDeg = seg.pitchDegrees || 0;
      totalWeightedPitch += pitchDeg * area;
      totalSegArea += area;
    });

    const avgPitchDeg = totalSegArea > 0 ? totalWeightedPitch / totalSegArea : 0;

    // Convert pitch degrees to x/12 ratio
    const pitchRatio = Math.round(Math.tan(avgPitchDeg * (Math.PI / 180)) * 12);

    return {
      totalAreaSqFt,
      segmentCount: roofSegments.length,
      avgPitchDegrees: Math.round(avgPitchDeg),
      pitchRatio, // e.g., 4 means 4/12
      segments: roofSegments.map((seg) => ({
        areaSqFt: Math.round((seg.stats?.areaMeters2 || 0) * 10.7639),
        pitchDegrees: Math.round(seg.pitchDegrees || 0),
        azimuthDegrees: Math.round(seg.azimuthDegrees || 0),
      })),
    };
  }

  return { fetchRoofData };
})();
