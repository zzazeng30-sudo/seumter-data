/* src/0004_Features/006_Map/03_Sections/02_Overlays/MapControls.jsx */
import React, { useState } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from '../../01_Pages/MapOverlays.module.css';

const MapControls = () => {
  // 컨텍스트에서 필요한 값들 가져오기
  const { mapInstanceRef, isRoadviewMode, setIsRoadviewMode } = useMap();
  
  // 내부 로컬 상태 (버튼 활성화 표시용)
  const [mapType, setMapType] = useState('ROADMAP'); 
  const [showDistrict, setShowDistrict] = useState(false); 

  // 1. 지도 vs 스카이뷰 토글
  const handleMapType = (e, type) => {
    e.stopPropagation();
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    const kakaoType = type === 'ROADMAP' 
      ? window.kakao.maps.MapTypeId.ROADMAP 
      : window.kakao.maps.MapTypeId.HYBRID;
    
    map.setMapTypeId(kakaoType);
    setMapType(type);
  };

  // 2. 지적편집도 vs 로드뷰 (배타적 선택 로직 포함)
  const handleOverlay = (e, mode) => {
    e.stopPropagation();
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    if (mode === 'district') {
      const nextState = !showDistrict;
      if (nextState) {
        map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
        setIsRoadviewMode(false); // 지적도 켜면 로드뷰 끔
      } else {
        map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
      }
      setShowDistrict(nextState);
    } 
    else if (mode === 'roadview') {
      const nextState = !isRoadviewMode;
      if (nextState) {
        // 로드뷰를 켤 때 지적도가 켜져있다면 끔
        map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
        setShowDistrict(false);
      }
      setIsRoadviewMode(nextState);
    }
  };

  return (
    <div className={styles.controlsContainer} onClick={(e) => e.stopPropagation()}>
      {/* 그룹 1: 지도/스카이 */}
      <div className={styles.controlGroup}>
        <button 
          className={`${styles.controlBtn} ${mapType === 'ROADMAP' ? styles.controlBtnActive : ''}`}
          onClick={(e) => handleMapType(e, 'ROADMAP')}
        >
          <span>지도</span>
        </button>
        <button 
          className={`${styles.controlBtn} ${mapType === 'HYBRID' ? styles.controlBtnActive : ''}`}
          onClick={(e) => handleMapType(e, 'HYBRID')}
        >
          <span>스카이</span>
        </button>
      </div>

      {/* 그룹 2: 지적/로드 */}
      <div className={styles.controlGroup}>
        <button 
          className={`${styles.controlBtn} ${showDistrict ? styles.controlBtnActive : ''}`}
          onClick={(e) => handleOverlay(e, 'district')}
        >
          <span>지적</span>
        </button>
        <button 
          className={`${styles.controlBtn} ${isRoadviewMode ? styles.controlBtnActive : ''}`}
          onClick={(e) => handleOverlay(e, 'roadview')}
        >
          <span>로드</span>
        </button>
      </div>
    </div>
  );
};

export default MapControls;