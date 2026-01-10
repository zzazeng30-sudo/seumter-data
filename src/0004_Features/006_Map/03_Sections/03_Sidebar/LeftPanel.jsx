/**
 * [Revision Info]
 * Rev: 31.0 (Mobile UX: Conditional Memo View & Responsive Layout)
 * Date: 2026-01-10
 * Author: AI Assistant (PropTech Expert)
 * [Improvements]
 * 1. 모바일 환경(isMobile)일 때 매물 클릭 시 상세 페이지 대신 메모만 표시되도록 로직 추가.
 * 2. 데스크탑 환경에서는 기존의 아코디언 리스트 스타일 유지.
 * 3. 인라인 스타일을 활용하여 모바일 하단 시트 내에서의 가독성 최적화.
 */

import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';

const LeftPanel = () => {
  const { 
    displayNodes, selectedPin, setSelectedPin, 
    mapInstanceRef, hoveredPinId, setHoveredPinId 
  } = useMap();
  
  const [expandedKeys, setExpandedKeys] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // 화면 너비 감지
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 선택된 매물에 따른 그룹 자동 펼침 (데스크탑 전용)
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
    
    const bg = isActive ? '#eff6ff' : (isHovered ? '#f3f4f6' : (isChild ? '#f8fafc' : 'white'));
    const borderLeftColor = isActive ? '#2563eb' : (isHovered ? '#3b82f6' : 'transparent');

    return (
      <li 
        key={pin.id} 
        onClick={(e) => { e.stopPropagation(); handleItemClick(pin); }} 
        onMouseEnter={() => !isMobile && setHoveredPinId(pin.id)} 
        onMouseLeave={() => !isMobile && setHoveredPinId(null)}   
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

  // ★ 모바일 전용 메모 뷰 렌더링 함수
  const renderMobileMemoView = () => {
    if (!selectedPin) return null;
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2563eb' }}>
          {selectedPin.address}
        </div>
        <div style={{ 
          backgroundColor: '#f1f5f9', 
          padding: '15px', 
          borderRadius: '10px', 
          fontSize: '0.95rem', 
          lineHeight: '1.6',
          minHeight: '120px',
          whiteSpace: 'pre-wrap'
        }}>
          {selectedPin.notes || "등록된 메모가 없습니다."}
        </div>
        <button 
          onClick={() => setSelectedPin(null)}
          style={{ 
            padding: '12px', 
            backgroundColor: '#2563eb', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: 'bold' 
          }}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  };

  return (
    <div style={{ 
      position: isMobile ? 'relative' : 'absolute', 
      top: 0, left: 0, bottom: 0, 
      width: isMobile ? '100%' : '320px', 
      zIndex: 1000, 
      backgroundColor: 'white', 
      borderRight: isMobile ? 'none' : '1px solid #e5e7eb', 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>
          {isMobile && selectedPin ? '매물 메모' : '매물 리스트'}
        </h2>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb' }}>
        {/* 모바일이면서 매물이 선택된 경우 메모 뷰 표시 */}
        {isMobile && selectedPin ? (
          renderMobileMemoView()
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(!displayNodes || displayNodes.length === 0) ? (
              <li style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>매물이 없습니다.</li>
            ) : (
              displayNodes.map((node) => {
                if (node.type === 'SINGLE') return renderItem(node.data, false);

                const isStack = node.type === 'STACK';
                const groupIds = node.items.map(i => String(i.id));
                
                const isGroupHovered = Array.isArray(hoveredPinId) 
                  ? (groupIds.length === hoveredPinId.length && groupIds.every(id => hoveredPinId.map(String).includes(id)))
                  : (hoveredPinId && groupIds.includes(String(hoveredPinId)));

                const isGroupActive = selectedPin && groupIds.includes(String(selectedPin.id));

                return (
                  <li key={node.id} style={{borderBottom:'1px solid #e5e7eb'}}>
                    <div 
                      onClick={() => toggleGroup(node.id)} 
                      onMouseEnter={() => !isMobile && setHoveredPinId(groupIds)}
                      onMouseLeave={() => !isMobile && setHoveredPinId(null)}
                      style={{ 
                        padding: '12px 16px', 
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
        )}
      </div>
    </div>
  );
};

export default LeftPanel;