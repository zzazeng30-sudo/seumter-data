/**
 * [Revision Info]
 * Rev: 30.0 (Unified Hover State Activation)
 * Date: 2026-01-09
 * Author: AI Assistant (PropTech Expert)
 * [Improvements]
 * 1. 지도 지역 묶음(Cluster) 호버 시 리스트 헤더를 마우스 올린 효과와 동일하게 즉각 활성화.
 * 2. String 기반 ID 비교 로직을 통해 데이터 타입 불일치 버그 해결.
 * 3. 호버된 대상(배열/단일)에 따른 배경색 및 보더 스타일 동적 적용.
 * [Logic Change Log]
 * - Before: 지도의 지역 묶음에 호버해도 리스트 헤더의 배경색과 보더가 변하지 않았음.
 * - After:  isGroupHovered 판정 시 groupIds와 hoveredPinId를 정확히 대조하여 시각 효과 강제 부여.
 */

import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';

const LeftPanel = () => {
  const { 
    displayNodes, selectedPin, setSelectedPin, 
    mapInstanceRef, hoveredPinId, setHoveredPinId 
  } = useMap();
  
  const [expandedKeys, setExpandedKeys] = useState({});

  // 선택된 매물에 따른 그룹 자동 펼침 제어
  useEffect(() => {
    const newExpandedKeys = {};
    if (selectedPin && selectedPin.id && displayNodes) {
      displayNodes.forEach(node => {
        if (node.items && node.items.length > 0) {
          if (node.items.some(item => String(item.id) === String(selectedPin.id))) {
            newExpandedKeys[node.id] = true; 
          }
        }
      });
    }
    setExpandedKeys(newExpandedKeys);
  }, [selectedPin, displayNodes]);

  const toggleGroup = (key) => setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const handleItemClick = (pin) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
    }
    setSelectedPin(pin);
  };

  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  // 개별 매물 아이템 렌더링
  const renderItem = (pin, isChild = false) => {
    const isActive = selectedPin && String(selectedPin.id) === String(pin.id);
    const isHovered = Array.isArray(hoveredPinId) 
      ? hoveredPinId.map(String).includes(String(pin.id)) 
      : String(hoveredPinId) === String(pin.id);
    
    // 호버/활성화 시 배경색 및 보더 강조
    const bg = isActive ? '#eff6ff' : (isHovered ? '#f3f4f6' : (isChild ? '#f8fafc' : 'white'));
    const borderLeftColor = isActive ? '#2563eb' : (isHovered ? '#3b82f6' : 'transparent');

    return (
      <li 
        key={pin.id} 
        onClick={(e) => { e.stopPropagation(); handleItemClick(pin); }} 
        onMouseEnter={() => setHoveredPinId(pin.id)} 
        onMouseLeave={() => setHoveredPinId(null)}   
        style={{
           padding: isChild ? '12px 16px 12px 30px' : '14px 16px',
           backgroundColor: bg, 
           borderBottom: '1px solid #f3f4f6',
           borderLeft: `4px solid ${borderLeftColor}`,
           cursor: 'pointer', display: 'flex', flexDirection: 'column', gap:'4px',
           transition: 'all 0.1s ease'
        }}
      >
         <div style={{fontSize:'0.9rem', color:'#333', display:'flex', alignItems:'center', gap:'6px'}}>
            <span style={{fontWeight:'bold', color: isActive ? '#2563eb' : '#444'}}>
              {truncate(pin.keywords || '매물', 8)}
            </span>
            <span style={{color:'#e5e7eb'}}>|</span>
            <span style={{fontWeight:'bold'}}>{pin.is_sale ? '매매' : pin.is_jeonse ? '전세' : '월세'}</span>
         </div>
         <div style={{fontSize:'0.85rem', color:'#666'}}>{truncate(pin.address, 15)}</div>
      </li>
    );
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '320px', zIndex: 1000, backgroundColor: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>매물 리스트</h2>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {(!displayNodes || displayNodes.length === 0) ? (
            <li style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>매물이 없습니다.</li>
          ) : (
            displayNodes.map((node) => {
              if (node.type === 'SINGLE') return renderItem(node.data, false);

              const isStack = node.type === 'STACK';
              const groupIds = node.items.map(i => String(i.id));
              
              // ★ 지도 묶음 마커 호버 판정 (아이디 배열 대조)
              const isGroupHovered = Array.isArray(hoveredPinId) 
                ? (groupIds.length === hoveredPinId.length && groupIds.every(id => hoveredPinId.map(String).includes(id)))
                : (hoveredPinId && groupIds.includes(String(hoveredPinId)));

              const isGroupActive = selectedPin && groupIds.includes(String(selectedPin.id));

              return (
                <li key={node.id} style={{borderBottom:'1px solid #e5e7eb'}}>
                  <div 
                    onClick={() => toggleGroup(node.id)} 
                    onMouseEnter={() => {
                      console.log('List Group Header Hover:', groupIds);
                      setHoveredPinId(groupIds);
                    }}
                    onMouseLeave={() => setHoveredPinId(null)}
                    style={{ 
                      padding: '12px 16px', 
                      // 호버 시 마우스 올린 효과와 동일한 배경색(#f3f4f6) 및 보더 부여
                      backgroundColor: isGroupActive ? '#eff6ff' : (isGroupHovered ? '#f3f4f6' : 'white'),
                      borderLeft: isGroupActive ? '4px solid #2563eb' : (isGroupHovered ? '4px solid #3b82f6' : 'none'),
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <div style={{backgroundColor: isStack ? '#10b981' : '#3b82f6', color:'white', borderRadius:'12px', padding:'2px 8px', fontSize:'0.75rem', fontWeight:'bold'}}>
                        {node.items.length}
                      </div>
                      <div style={{fontWeight:'bold', color: (isGroupActive || isGroupHovered) ? '#2563eb' : '#111827', fontSize:'0.95rem'}}>
                         {truncate(isStack ? '동일위치 매물' : '지역 묶음', 14)}
                      </div>
                    </div>
                    <div style={{fontSize:'0.8rem', color:'#999'}}>{expandedKeys[node.id] ? '▲' : '▼'}</div>
                  </div>
                  {expandedKeys[node.id] && (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {node.items.map(subItem => renderItem(subItem, true))}
                    </ul>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

export default LeftPanel;