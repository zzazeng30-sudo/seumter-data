// src/services/buildingService.js

const API_KEY = "1901e179822c234a1ffe8b565931e8c64085d5ceb8002f7e249330174dfc0d25"; // ★ 공공데이터포털 인증키 (Decoding) 입력
const BASE_URL = "http://apis.data.go.kr/1613000/BldRgstHubService";

// API 목록 (변경 없음)
const API_OPERATIONS = {
  1: "getBrBasisOulnInfo",       // 기본개요
  2: "getBrRecapTitleInfo",      // 총괄표제부
  3: "getBrTitleInfo",           // 표제부
  4: "getBrFlrOulnInfo",         // 층별개요
  5: "getBrAtchJibunInfo",       // 부속지번
  6: "getBrExposPubuseAreaInfo", // 전유공용면적
  7: "getBrWclfInfo",            // 오수정화시설
  8: "getBrHsprcInfo",           // 주택가격
  9: "getBrExposInfo",           // 전유부
  10: "getBrJijiguInfo"          // 지역지구구역
};

const parsePnu = (pnu) => {
  if (!pnu || pnu.length < 19) return null;
  return {
    sigunguCd: pnu.substring(0, 5),
    bjdongCd: pnu.substring(5, 10),
    bun: pnu.substring(11, 15),
    ji: pnu.substring(15, 19)
  };
};

const fetchApi = async (operation, params) => {
  try {
    const queryParams = new URLSearchParams({
      serviceKey: API_KEY,
      sigunguCd: params.sigunguCd,
      bjdongCd: params.bjdongCd,
      bun: params.bun,
      ji: params.ji,
      numOfRows: "100",
      pageNo: "1",
      _type: "json"
    });

    const response = await fetch(`${BASE_URL}/${operation}?${queryParams.toString()}`);
    const data = await response.json();
    
    if (!data.response || !data.response.body || !data.response.body.items) return null;
    const items = data.response.body.items.item;
    return Array.isArray(items) ? items : [items];

  } catch (error) {
    console.error(`API Error (${operation}):`, error);
    return null;
  }
};

// [수정됨] 1번 요청 시 3번(표제부)도 같이 조회하여 병합
export const fetchFineGrainedData = async (pnu, targetCatIds = []) => {
  const code = parsePnu(pnu);
  if (!code) return "PNU 오류";

  // 요청 목록 복사
  let operationsToFetch = [...targetCatIds];

  // ★ 핵심: 1번(기본개요)이 요청되면 3번(표제부)도 무조건 같이 가져옵니다.
  if (operationsToFetch.includes(1)) {
    if (!operationsToFetch.includes(3)) operationsToFetch.push(3);
  }

  const promises = Object.entries(API_OPERATIONS)
    .filter(([catId]) => operationsToFetch.includes(parseInt(catId)))
    .map(async ([catId, operation]) => {
      const result = await fetchApi(operation, code);
      return { catId: parseInt(catId), data: result };
    });

  if (promises.length === 0) return "선택된 항목 없음";

  const results = await Promise.all(promises);

  let mergedData = {};
  let hasMeaningfulData = false;

  results.forEach(({ catId, data }) => {
    if (!data || data.length === 0) return;

    // 4번(층별) 면적 확인
    if (catId === 4) {
      mergedData.floorDetails = data;
      if (data.some(floor => floor.area && parseFloat(floor.area) > 0)) {
        hasMeaningfulData = true;
      }
    } 
    // 리스트형 데이터 (5~10)
    else if ([5, 6, 7, 8, 9, 10].includes(catId)) {
        mergedData[`list_cat_${catId}`] = data;
        if (data.length > 0) Object.assign(mergedData, data[0]);
        hasMeaningfulData = true;
    }
    // 1, 2, 3번 (기본 정보 병합)
    else {
      if (data.length > 0) {
        Object.assign(mergedData, data[0]);
        hasMeaningfulData = true;
      }
    }
  });

  if (!hasMeaningfulData) return "데이터 없음";

  return mergedData;
};