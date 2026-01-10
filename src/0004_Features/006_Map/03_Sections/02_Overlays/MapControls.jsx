import React, { useState } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from '../../01_Pages/MapOverlays.module.css'; // ★ 1. CSS 모듈 import 추가

const MapControls = () => {
  const { mapInstanceRef, isRoadviewMode, setIsRoadviewMode } = useMap();
  const [mapType, setMapType] = useState('ROADMAP'); 
  const [showDistrict, setShowDistrict] = useState(false); 

  const toggleMapType = (type) => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;
    const mapTypeControl = type === 'ROADMAP' ? window.kakao.maps.MapTypeId.ROADMAP : window.kakao.maps.MapTypeId.HYBRID;
    map.setMapTypeId(mapTypeControl);
    setMapType(type);
  };

  const toggleDistrict = () => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;
    if (!showDistrict) map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    else map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    setShowDistrict(!showDistrict);
  };

  /* ★ [삭제] 기존 containerStyle은 CSS 파일(.controlsContainer)로 이동했습니다.
     const containerStyle = { ... }; 
  */

  const btnStyle = (active) => ({
    padding: '8px 12px', border: 'none', borderRight: '1px solid #eee',
    backgroundColor: active ? '#2563eb' : 'white',
    color: active ? 'white' : '#333',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600'
  });

  return (
    // ★ 2. style 속성 대신 className 사용
    <div className={styles.controlsContainer}>
      <button style={btnStyle(mapType === 'ROADMAP')} onClick={() => toggleMapType('ROADMAP')}>지도</button>
      <button style={btnStyle(mapType === 'HYBRID')} onClick={() => toggleMapType('HYBRID')}>스카이뷰</button>
      <button style={btnStyle(showDistrict)} onClick={toggleDistrict}>지적편집도</button>
      
      <button 
        style={{...btnStyle(isRoadviewMode), borderRight: 'none'}} 
        onClick={() => setIsRoadviewMode(!isRoadviewMode)}
      >
        로드뷰
      </button>
    </div>
  );
};

export default MapControls;