import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import styles from './LandAnalysis.module.css';
import { fetchPnuListInPolygon } from '../../services/vworldService';
import { fetchFineGrainedData } from '../../services/buildingService';
import { seumterService } from '../../services/seumterService';

const LandAnalysisPage = () => {
  // ==========================================
  // [SECTION 1] 상태 관리 (States)
  // ==========================================
  const [results, setResults] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("영역 그리기 버튼을 눌러 분석을 시작하세요.");

  // 세움터 로그인 관련 상태
  const [isSeumterLoginOpen, setIsSeumterLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginInputs, setLoginInputs] = useState({ id: '', pw: '' });
  // ★ 중요: 실제 API 호출에 사용할 자격증명 저장소
  const [seumterCredentials, setSeumterCredentials] = useState(null);

  // 지도 관련 참조(Refs)
  const mapRef = useRef(null);
  const containerRef = useRef(null); 
  const polylineRef = useRef(null);
  const polygonRef = useRef(null);
  const pointsRef = useRef([]);

  // 데이터 추출 항목 설정 상태
  const [fieldOptions, setFieldOptions] = useState([
    { id: 'platPlc', label: '대지위치', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'newPlatPlc', label: '도로명대지위치', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'bldNm', label: '건물명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'mgmBldrgstPk', label: '관리번호(PK)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'jiyukCdNm', label: '지역코드명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'jiguCdNm', label: '지구코드명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'guyukCdNm', label: '구역코드명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'mainPurpsCdNm', label: '주용도', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'strctCdNm', label: '주구조', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'roofCdNm', label: '지붕구조', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'heit', label: '높이(m)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'grndFlrCnt', label: '지상층수', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'ugrndFlrCnt', label: '지하층수', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'platArea', label: '대지면적(㎡)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'archArea', label: '건축면적(㎡)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'totArea', label: '연면적(㎡)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'bcRat', label: '건폐율(%)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'vlRat', label: '용적률(%)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'useAprDay', label: '사용승인일', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'pmsDay', label: '허가일', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'stcnsDay', label: '착공일', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'totPkngCnt', label: '총주차수', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'rideUseElvtCnt', label: '승강기(승용)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'mainBldCnt', label: '주건축물수', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'atchBldCnt', label: '부속건축물수', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'hhldCnt', label: '세대수(총괄)', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'fmlyCnt', label: '가구수(총괄)', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'gnBldGrade', label: '친환경등급', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'engrGrade', label: '에너지효율', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'flrNoNm', label: '층명칭', catId: 4, category: '4.층별개요', checked: false },
    { id: 'flrGbCdNm', label: '층구분', catId: 4, category: '4.층별개요', checked: false },
    { id: 'strctCdNm', label: '구조(층별)', catId: 4, category: '4.층별개요', checked: false },
    { id: 'mainPurpsCdNm', label: '용도(층별)', catId: 4, category: '4.층별개요', checked: false },
    { id: 'area', label: '면적(㎡)', catId: 4, category: '4.층별개요', checked: false },
    { id: 'atchBun', label: '부속번', catId: 5, category: '5.부속지번', checked: false },
    { id: 'atchJi', label: '부속지', catId: 5, category: '5.부속지번', checked: false },
    { id: 'atchRegstrGbCdNm', label: '부속대장구분', catId: 5, category: '5.부속지번', checked: false },
    { id: 'dongNm', label: '동명칭', catId: 6, category: '6.전유공용', checked: false },
    { id: 'hoNm', label: '호명칭', catId: 6, category: '6.전유공용', checked: false },
    { id: 'exposPubuseGbCdNm', label: '전유공용구분', catId: 6, category: '6.전유공용', checked: false },
    { id: 'area', label: '면적(㎡)', catId: 6, category: '6.전유공용', checked: false },
    { id: 'modeCdNm', label: '형식', catId: 7, category: '7.오수정화', checked: false },
    { id: 'capaPsper', label: '용량(인용)', catId: 7, category: '7.오수정화', checked: false },
    { id: 'capaLube', label: '용량(루베)', catId: 7, category: '7.오수정화', checked: false },
    { id: 'hsprc', label: '주택가격', catId: 8, category: '8.주택가격', checked: false },
    { id: 'stdDay', label: '기준일자', catId: 8, category: '8.주택가격', checked: false },
    { id: 'dongNm', label: '동명칭', catId: 9, category: '9.전유부', checked: false },
    { id: 'hoNm', label: '호명칭', catId: 9, category: '9.전유부', checked: false },
    { id: 'flrNo', label: '층번호', catId: 9, category: '9.전유부', checked: false },
    { id: 'jijiguCdNm', label: '지역지구명', catId: 10, category: '10.지역지구', checked: false },
    { id: 'reprYn', label: '대표여부', catId: 10, category: '10.지역지구', checked: false },
    { id: 'ownerName', label: '성명', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerJumin', label: '주민번호', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerAddr', label: '주소', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerShare', label: '지분', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerReason', label: '변동원인', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerDate', label: '변동일', catId: 11, category: '11.소유자정보', checked: false },
  ]);

  // ==========================================
  // [SECTION 2] 지도 초기화 및 이벤트 (Kakao Maps)
  // ==========================================
  useEffect(() => {
    const initMap = () => {
      const container = containerRef.current;
      if (!container) return;
      const map = new window.kakao.maps.Map(container, { center: new window.kakao.maps.LatLng(36.7857, 127.0080), level: 3 });
      mapRef.current = map;
      polylineRef.current = new window.kakao.maps.Polyline({ strokeWeight: 4, strokeColor: '#0984e3', strokeOpacity: 0.8 });
      map.setZoomable(true);

      window.kakao.maps.event.addListener(map, 'click', (e) => {
        if (!window.DRAW_MODE) return;
        const path = polylineRef.current.getPath();
        path.push(e.latLng);
        polylineRef.current.setPath(path);
        polylineRef.current.setMap(map);
        pointsRef.current.push(e.latLng);
      });

      window.kakao.maps.event.addListener(map, 'rightclick', async (e) => {
        if (!window.DRAW_MODE || pointsRef.current.length < 2) return;
        window.DRAW_MODE = false; setIsDrawing(false);
        pointsRef.current.push(e.latLng);
        polylineRef.current.setMap(null);
        const polygon = new window.kakao.maps.Polygon({ path: pointsRef.current, strokeWeight: 2, strokeColor: '#0984e3', fillOpacity: 0.2, fillColor: '#0984e3' });
        polygon.setMap(map);
        polygonRef.current = polygon;
        
        setStatusMsg("지번 추출 중... (대량 데이터일 경우 시간이 소요됩니다)");
        const pnuList = await fetchPnuListInPolygon(pointsRef.current.map(p => ({ lat: p.getLat(), lng: p.getLng() })));
        setResults(pnuList.map(item => ({ ...item, detail: null, status: 'ready', reason: '' })));
        setProgress(0);
        setStatusMsg(`${pnuList.length}건 확인됨. 분석을 시작하세요.`);
      });
    };
    if (window.kakao && window.kakao.maps) window.kakao.maps.load(initMap);
  }, []);

  const startDrawing = () => {
    window.DRAW_MODE = true; setIsDrawing(true); setResults([]); pointsRef.current = []; setProgress(0);
    if (polygonRef.current) polygonRef.current.setMap(null);
    if (polylineRef.current) polylineRef.current.setPath([]);
  };

  // ==========================================
  // [SECTION 3] 데이터 수집 및 분석 (Handlers - 수정됨)
  // ==========================================
  const handleFetchData = async () => {
    const selectedCatIds = [...new Set(
      fieldOptions.filter(opt => opt.checked).map(opt => opt.catId)
    )];

    if (selectedCatIds.length === 0) {
      alert("최소 1개 이상의 항목을 선택해주세요.");
      return;
    }

    setIsPopupOpen(false); 
    setLoading(true); 
    setProgress(0);
    
    let updatedResults = [...results];

    // 소유자 정보 체크되었으나 로그인이 안된 경우 (이론상 UI에서 막히지만 한번 더 체크)
    if (selectedCatIds.includes(11) && !isLoggedIn) {
        alert("소유자 정보를 수집하려면 세움터 로그인이 필요합니다.");
        setLoading(false);
        return;
    }

    for (let i = 0; i < updatedResults.length; i++) {
      const currentTarget = updatedResults[i];
      console.group(`🔍 [${i + 1}/${updatedResults.length}] 대상 분석: ${currentTarget.address}`);
      setStatusMsg(`데이터 분석 중... [${i + 1}/${updatedResults.length}]`);
      
      console.log("📡 1단계: 일반 건물 정보 수집 중 (buildingService)...");
      const detail = await fetchFineGrainedData(currentTarget.pnu, selectedCatIds.filter(id => id !== 11));
      let currentDetail = (detail !== "데이터 없음" && detail !== "선택된 항목 없음") ? detail : {};

      // ★ 11번 항목 선택 시 백엔드 API 호출
      if (isLoggedIn && selectedCatIds.includes(11) && seumterCredentials) {
        console.log("📡 2단계: 세움터 소유자 정보 수집 중 (Server API)...");
        setStatusMsg(`[${i + 1}/${updatedResults.length}] 소유자 수집 중: ${currentTarget.address}`);
        
        try {
          // 저장된 ID/PW와 현재 주소를 보냄
          const ownerList = await seumterService.getOwnerInfo(
            currentTarget.address, 
            seumterCredentials.id, 
            seumterCredentials.pw
          );

          if (ownerList && ownerList.length > 0) {
            console.log(`✅ 소유자 정보 수집 완료: ${ownerList.length}명`);
            
            // 👇 [추가된 부분] 콘솔에 상세 데이터 출력 로직 👇
            console.group("📋 수집된 상세 데이터 확인 (F12)");
            console.table(ownerList); // 표 형태로 깔끔하게 보기
            
            ownerList.forEach((owner, idx) => {
                console.log(`👤 [소유자 ${idx + 1}]`);
                console.log(`   - 성명(A): ${owner.name}`);
                console.log(`   - 주민번호(A): ${owner.id}`);
                console.log(`   - 주소(B): ${owner.address}`);
                console.log(`   - 지분(C): ${owner.share}`);
                console.log(`   - 변동일(D): ${owner.date}`);
                console.log(`   - 변동원인(D): ${owner.reason}`);
                console.log("--------------------------------------------------");
            });
            console.groupEnd();
            // 👆 [여기까지 추가됨] 👆

            currentDetail.ownerInfo = ownerList;
          }
        } catch (botErr) {
            console.error("❌ 소유자 정보 수집 실패:", botErr);
            // 실패해도 일반 건축물 정보는 남기기 위해 에러는 로그만 찍고 넘어감
        }
      }

      updatedResults[i] = { 
        ...currentTarget, 
        detail: Object.keys(currentDetail).length > 0 ? currentDetail : null, 
        status: Object.keys(currentDetail).length > 0 ? 'done' : 'fail',
        reason: Object.keys(currentDetail).length > 0 ? '' : '데이터 없음'
      };

      console.groupEnd();
      setProgress(Math.round(((i + 1) / updatedResults.length) * 100));
      setResults([...updatedResults]);
    }
    setLoading(false); 
    console.log("🏁 모든 데이터 분석이 완료되었습니다.");
    setStatusMsg("분석 완료.");
  };

  // ==========================================
  // [SECTION 4] 유틸리티 및 기타 핸들러 (Excel, Login)
  // ==========================================
  
  const handleDownloadExcel = () => {
    if (results.length === 0) return alert("데이터가 없습니다.");
    const selectedHeaders = fieldOptions.filter(f => f.checked);
    const excelData = [];
    
    results.forEach(item => {
      const baseInfo = { "주소": item.address, "PNU": item.pnu };
      
      const owners = (item.detail && item.detail.ownerInfo) ? item.detail.ownerInfo : [{}];
      
      owners.forEach((owner, ownerIdx) => {
          const row = { ...baseInfo };
          if(owners.length > 1) row["순번"] = ownerIdx + 1; // 소유자가 많으면 순번 표시

          selectedHeaders.forEach(h => {
            if (h.catId === 11) {
               // 소유자 정보 매핑
               if(h.id === 'ownerName') row[h.label] = owner.name || "-";
               else if(h.id === 'ownerJumin') row[h.label] = owner.id || "-";
               else if(h.id === 'ownerAddr') row[h.label] = owner.address || "-";
               else if(h.id === 'ownerShare') row[h.label] = owner.share || "-";
               else if(h.id === 'ownerReason') row[h.label] = owner.reason || "-";
               else if(h.id === 'ownerDate') row[h.label] = owner.date || "-";
               else row[h.label] = "-";
            }
            else if (item.detail && item.detail[h.id]) {
              row[h.label] = item.detail[h.id];
            } 
            else if (item.detail && item.detail.floorDetails && item.detail.floorDetails.length > 0 && item.detail.floorDetails[0][h.id]) {
               row[h.label] = item.detail.floorDetails[0][h.id];
            }
            else {
              row[h.label] = "-";
            }
          });
          excelData.push(row);
      });
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "종합분석결과");
    XLSX.writeFile(wb, `Building_Report_${new Date().getTime()}.xlsx`);
  };

  // 로그인 팝업 핸들러 (자격증명 저장용)
  const handleLoginSubmit = async () => {
    if (!loginInputs.id || !loginInputs.pw) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    // 간단히 저장 후 닫기 (실제 통신은 분석 시작 시 각 건마다 수행)
    setSeumterCredentials({ id: loginInputs.id, pw: loginInputs.pw });
    setIsLoggedIn(true);
    setIsSeumterLoginOpen(false);
    
    // 소유자 정보(11번) 카테고리 전체 자동 활성화
    setFieldOptions(prev => prev.map(f => f.catId === 11 ? { ...f, checked: true } : f));
    
    alert("정보가 저장되었습니다. '분석 시작'을 누르면 해당 계정으로 수집을 진행합니다.");
  };

  // ==========================================
  // [SECTION 5] 화면 렌더링 함수 (UI Components)
  // ==========================================
  const renderLoginPopup = () => {
    if (!isSeumterLoginOpen) return null;
    return (
      <div className={styles.modalOverlay} style={{zIndex: 2000}}>
        <div className={styles.documentModal} style={{width: '350px', height: 'auto', padding: '0', overflow: 'hidden'}}>
          <div className={styles.docHeader} style={{background: '#007bff', color: 'white', padding: '15px'}}>
            <h3 style={{margin:0, fontSize:'16px'}}>세움터 정보 입력</h3>
            <button onClick={() => setIsSeumterLoginOpen(false)} style={{color:'white'}}>✕</button>
          </div>
          <div className={styles.docBody} style={{padding: '25px', display:'flex', flexDirection:'column', gap:'10px'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'5px', lineHeight: '1.4'}}>
              <strong>로그인 정보</strong>를 입력하세요.<br/>입력된 정보로 세움터에 접속하여 분석을 진행합니다.
            </p>
            <input type="text" placeholder="세움터 아이디" value={loginInputs.id} onChange={(e) => setLoginInputs({...loginInputs, id: e.target.value})} style={{padding: '12px', border: '1px solid #ddd', borderRadius: '4px'}} />
            <input type="password" placeholder="비밀번호" value={loginInputs.pw} onChange={(e) => setLoginInputs({...loginInputs, pw: e.target.value})} style={{padding: '12px', border: '1px solid #ddd', borderRadius: '4px'}} />
            <button onClick={handleLoginSubmit} style={{marginTop: '10px', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'}}>저장 및 닫기</button>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailPopup = () => {
    if (!selectedItem || !selectedItem.detail) return null;
    const d = selectedItem.detail;
    const commonInfo = {
      address: d.platPlc || selectedItem.address,
      roadAddr: d.newPlatPlc || '-',
      bldName: d.bldNm || '-',
      pnu: selectedItem.pnu,
      date: d.useAprDay || d.crtnDay || '-'
    };
    return (
      <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
        <div className={styles.documentModal} onClick={e => e.stopPropagation()} style={{maxWidth:'900px', width:'90%'}}>
          <div className={styles.docHeader}>
            <h2>건축물 통합 상세 정보</h2>
            <button onClick={() => setSelectedItem(null)}>✕</button>
          </div>
          <div className={styles.docBody} style={{maxHeight:'80vh', overflowY:'auto', padding:'20px'}}>
            <div className={styles.sectionTitle}>📍 기본 정보</div>
            <table className={styles.docTable}>
              <tbody>
                <tr><th>대지위치</th><td colSpan="3">{commonInfo.address}</td></tr>
                <tr><th>도로명주소</th><td colSpan="3">{commonInfo.roadAddr}</td></tr>
                <tr><th>건물명</th><td>{commonInfo.bldName}</td><th>PNU</th><td>{commonInfo.pnu}</td></tr>
              </tbody>
            </table>
            <div className={styles.sectionTitle} style={{marginTop:'20px'}}>👤 소유자 현황</div>
            <table className={styles.docTable}>
              <thead>
                <tr><th>성명</th><th>주민번호</th><th>주소</th><th>지분</th><th>변동일</th><th>변동원인</th></tr>
              </thead>
              <tbody>
                {d.ownerInfo ? d.ownerInfo.map((owner, idx) => (
                  <tr key={idx}><td>{owner.name}</td><td>{owner.id}</td><td>{owner.address}</td><td>{owner.share}</td><td>{owner.date}</td><td>{owner.reason}</td></tr>
                )) : <tr><td colSpan="6" style={{textAlign:'center', color:'#999'}}>소유자 정보가 없습니다. (혹은 수집 실패)</td></tr>}
              </tbody>
            </table>
            <div className={styles.sectionTitle} style={{marginTop:'20px'}}>🏢 건축물 개요</div>
            <table className={styles.docTable}>
              <tbody>
                <tr><th>대지면적</th><td>{d.platArea || '-'} ㎡</td><th>연면적</th><td>{d.totArea || '-'} ㎡</td></tr>
                <tr><th>건축면적</th><td>{d.archArea || '-'} ㎡</td><th>높이</th><td>{d.heit || '-'} m</td></tr>
                <tr><th>건폐율</th><td>{d.bcRat || '-'} %</td><th>용적률</th><td>{d.vlRat || '-'} %</td></tr>
                <tr><th>주용도</th><td>{d.mainPurpsCdNm || '-'}</td><th>주구조</th><td>{d.strctCdNm || '-'}</td></tr>
                <tr><th>지상/지하</th><td>지상 {d.grndFlrCnt || 0}층 / 지하 {d.ugrndFlrCnt || 0}층</td><th>승강기</th><td>승용 {d.rideUseElvtCnt || 0}대</td></tr>
              </tbody>
            </table>
            {d.floorDetails && d.floorDetails.length > 0 && (
              <>
                <div className={styles.sectionTitle} style={{marginTop:'20px'}}>📑 층별 현황</div>
                <table className={styles.docTable}>
                  <thead><tr><th>층명</th><th>구조</th><th>용도</th><th>면적(㎡)</th></tr></thead>
                  <tbody>
                    {d.floorDetails.map((f, i) => (
                      <tr key={i}><td>{f.flrNoNm}</td><td>{f.strctCdNm}</td><td>{f.mainPurpsCdNm}</td><td>{f.area}</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboard}>
      <nav className={styles.topToolbar}>
        <div className={styles.logo}>BUILDING<span>INSIGHT</span></div>
        <div className={styles.actionGroup}>
          <button onClick={startDrawing} className={`${styles.btnNav} ${isDrawing ? styles.btnActive : ''}`}>✏️ 영역 그리기</button>
          <button onClick={() => setIsPopupOpen(true)} className={styles.btnNav} disabled={results.length === 0}>⚙️ 수집 항목 설정</button>
          <button onClick={handleDownloadExcel} className={styles.btnExcel} disabled={results.length === 0}>📊 엑셀 저장</button>
        </div>
      </nav>

      <main className={styles.mainLayout}>
        <div className={styles.mapContainer}>
          <div id="analysis-map-unique" ref={containerRef} className={styles.kakaoMap}></div>
          <div className={styles.mapStatusOverlay}>{statusMsg}</div>
        </div>
        <aside className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <h3>대상 목록 <span className={styles.badge}>{results.length}</span>
            {loading && <span className={styles.progressText}>({progress}%)</span>}</h3>
          </div>
          {loading && <div className={styles.progressBarWrapper}><div className={styles.progressBar} style={{ width: `${progress}%` }}></div></div>}
          <div className={styles.listContainer}>
            {results.map((item, i) => (
              <div key={i} className={styles.resultCard} onClick={() => item.status === 'done' && setSelectedItem(item)}>
                <div className={styles.cardHeader}>
                  <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                    {item.status === 'done' ? "성공" : (item.status === 'fail' ? "없음" : "대기")}
                  </span>
                  <span className={styles.addrText}>{item.address}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {isPopupOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{width: '90%', maxWidth: '1200px', height: '92vh', minHeight: '850px', display: 'flex', flexDirection: 'column'}}>
            <div className={styles.modalHeader} style={{flexShrink: 0}}><h2>데이터 추출 항목 설정</h2></div>
            <div className={styles.docBody} style={{flexGrow: 1, padding:'20px', display: 'flex', gap: '20px', overflowY: 'auto'}}>
              <div style={{width: '320px', flexShrink: 0, height: '100%', paddingRight: '5px'}}>
                <div className={styles.categoryGroup} style={{border: '2px solid #007bff', padding: '15px', borderRadius: '8px', background: '#eef6fc', minHeight: '100%', boxSizing: 'border-box'}}>
                  <h4 style={{margin: '0 0 15px 0', borderBottom: '2px solid #007bff', paddingBottom: '5px', color: '#007bff'}}>
                    <label style={{cursor: 'not-allowed', display: 'flex', alignItems: 'center'}}>
                      <input type="checkbox" checked={true} disabled={true} style={{marginRight: '8px'}} />
                      1. 표제부(기본개요) (필수)
                    </label>
                  </h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {fieldOptions.filter(f => f.catId === 1).map(opt => (
                      <label key={opt.id} style={{display: 'flex', alignItems: 'center', fontSize: '13px', cursor: 'not-allowed', color: '#555'}}>
                        <input type="checkbox" checked={opt.checked} disabled={true} style={{marginRight: '8px'}} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{flexGrow: 1, height: '100%', paddingRight: '5px'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '15px', height: '100%'}}>
                  {[2, 4, 5, 6, 7, 8, 9, 10, 11].map(catId => {
                    const groupOptions = fieldOptions.filter(f => f.catId === catId);
                    const isAllChecked = groupOptions.length > 0 && groupOptions.every(o => o.checked);
                    let categoryLabel = groupOptions[0]?.category.split('.')[1] || `카테고리 ${catId}`;
                    if(catId === 11) categoryLabel = "소유자정보";
                    return (
                      <div key={catId} className={styles.categoryGroup} style={{border: '1px solid #ddd', padding: '10px', borderRadius: '8px', background: '#f9f9f9', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                        <h4 style={{margin: '0 0 10px 0', borderBottom: '2px solid #007bff', paddingBottom: '5px', color: '#333', flexShrink: 0}}>
                          <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                            <input 
                              type="checkbox" 
                              checked={isAllChecked}
                              onChange={(e) => {
                                const newValue = e.target.checked;
                                if (catId === 11 && newValue === true && !isLoggedIn) {
                                  e.preventDefault();
                                  setIsSeumterLoginOpen(true);
                                  return;
                                }
                                setFieldOptions(fieldOptions.map(f => f.catId === catId ? { ...f, checked: newValue } : f));
                              }}
                              style={{marginRight: '8px'}}
                            />
                            {catId}. {categoryLabel}
                          </label>
                        </h4>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1}}>
                          {groupOptions.map(opt => (
                            <label key={opt.id} style={{display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer'}}>
                              <input 
                                type="checkbox" 
                                checked={opt.checked} 
                                onChange={(e) => {
                                    if (catId === 11 && e.target.checked && !isLoggedIn) {
                                        e.preventDefault();
                                        setIsSeumterLoginOpen(true);
                                        return;
                                    }
                                    setFieldOptions(fieldOptions.map(f => f.id === opt.id && f.catId === opt.catId ? {...f, checked: !f.checked} : f));
                                }}
                                style={{marginRight: '6px'}}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter} style={{flexShrink: 0}}>
              <button className={styles.btnStart} onClick={handleFetchData}>분석 시작</button>
              <button className={styles.btnCancel} onClick={() => setIsPopupOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && renderDetailPopup()}
      {isSeumterLoginOpen && renderLoginPopup()}
    </div>
  );
};

export default LandAnalysisPage;