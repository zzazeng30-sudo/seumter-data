/**
 * [Revision Info]
 * Rev: 24.0 (Roadview Toggle)
 * Author: AI Assistant
 * * [Improvements]
 * 1. 로드뷰 버튼 클릭 시 setIsRoadviewMode 토글
 * 2. 활성화 상태(파란색) 표시
 */
import React, { useState } from 'react';
import { useMap } from '../../02_Contexts/MapContext';

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

  const containerStyle = {
    position: 'absolute', top: '20px', right: '20px', zIndex: 20,
    display: 'flex', backgroundColor: 'white', borderRadius: '4px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)', overflow: 'hidden'
  };

  const btnStyle = (active) => ({
    padding: '8px 12px', border: 'none', borderRight: '1px solid #eee',
    backgroundColor: active ? '#2563eb' : 'white',
    color: active ? 'white' : '#333',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600'
  });

  return (
    <div style={containerStyle}>
      <button style={btnStyle(mapType === 'ROADMAP')} onClick={() => toggleMapType('ROADMAP')}>지도</button>
      <button style={btnStyle(mapType === 'HYBRID')} onClick={() => toggleMapType('HYBRID')}>스카이뷰</button>
      <button style={btnStyle(showDistrict)} onClick={toggleDistrict}>지적편집도</button>
      
      {/* ★ 로드뷰 버튼 연결 */}
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