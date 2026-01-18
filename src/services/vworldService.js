const VWORLD_KEY = 'B7941404-230D-3C80-AD35-0D7766882694';

export const fetchPnuListInPolygon = async (polygonCoords) => {
  if (!polygonCoords || polygonCoords.length < 3) return [];

  const lngs = polygonCoords.map(c => c.lng);
  const lats = polygonCoords.map(c => c.lat);
  const bbox = `${Math.min(...lngs)},${Math.min(...lats)},${Math.max(...lngs)},${Math.max(...lats)}`;

  const params = new URLSearchParams({
    key: VWORLD_KEY,
    SERVICE: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    TYPENAME: "lp_pa_cbnd_bubun",
    SRSNAME: "EPSG:4326",
    OUTPUT: "application/json",
    maxFeatures: "1000",
    BBOX: bbox
  });

  try {
    const response = await fetch(`/api/vworld/req/wfs?${params.toString()}`);
    const data = await response.json();
    
    if (!data.features) return [];

    return data.features
      .map(f => ({
        pnu: f.properties.pnu,
        address: f.properties.addr || "주소 미표기"
      }))
      .filter(item => item.address.includes("아산"));
  } catch (err) {
    console.error("VWorld API Error:", err);
    return [];
  }
};