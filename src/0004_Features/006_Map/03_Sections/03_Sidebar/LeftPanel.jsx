import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import PinForm from './PinForm';
import styles from './LeftPanel.module.css';

const LeftPanel = () => {
  const { 
    displayNodes, selectedPin, setSelectedPin, 
    mapInstanceRef, hoveredPinId, setHoveredPinId,
    isCreating, isEditMode
  } = useMap();
  
  const [expandedKeys, setExpandedKeys] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 선택된 매물에 따른 그룹 자동 펼침
  useEffect(() => {
    const newExpandedKeys = { ...expandedKeys };
    if (selectedPin && selectedPin.id && displayNodes) {
      displayNodes.forEach(node => {
        if (node.items && node.items.some(item => String(item.id) === String(selectedPin.id))) {
          newExpandedKeys[node.id] = true; 
        }
      });
      setExpandedKeys(newExpandedKeys);
    }
  }, [selectedPin, displayNodes]);

  const toggleGroup = (key) => setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const handleItemClick = (pin) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
    }
    setSelectedPin(pin); // 여기서 selectedPin이 설정되면 renderMobileDetail이 활성화됨
  };

  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  const getPriceString = (pin) => {
    if (!pin) return '-';
    const fmt = n => Number(n || 0).toLocaleString();
    if (pin.is_sale) return `매매 ${fmt(pin.sale_price)}만원`;
    if (pin.is_jeonse) return `전세 ${fmt(pin.jeonse_deposit)}만원`;
    if (pin.is_rent) return `월세 ${fmt(pin.rent_amount)} | 보증금 ${fmt(pin.rent_deposit)}`;
    return '-';
  };

  const renderItem = (pin, isChild = false) => {
    const isActive = selectedPin && String(selectedPin.id) === String(pin.id);
    const isHovered = Array.isArray(hoveredPinId) 
      ? hoveredPinId.map(String).includes(String(pin.id)) 
      : String(hoveredPinId) === String(pin.id);
    
    return (
      <li 
        key={pin.id} 
        onClick={(e) => { 
          e.stopPropagation(); // 부모(그룹) 클릭 방지
          handleItemClick(pin); 
        }} 
        onMouseEnter={() => !isMobile && setHoveredPinId(pin.id)} 
        onMouseLeave={() => !isMobile && setHoveredPinId(null)}   
        className={`
          ${styles.item} 
          ${isChild ? styles.childItem : ''} 
          ${isActive ? styles.active : ''} 
          ${isHovered ? styles.hovered : ''}
        `}
      >
         <div className={styles.itemHeader}>
            <span className={styles.keywords}>{truncate(pin.keywords || '매물', 8)}</span>
            <span className={styles.divider}>|</span>
            <span className={styles.typeLabel}>{pin.is_sale ? '매매' : pin.is_jeonse ? '전세' : '월세'}</span>
         </div>
         <div className={styles.addressLabel}>{truncate(pin.address, 15)}</div>
      </li>
    );
  };

  // 상세 보기(메모) 렌더링 로직 복구
  const renderMobileDetail = () => {
    if (!selectedPin) return null;
    return (
      <div className={styles.detailContainer} style={{ padding: '20px' }}>
        <button 
          className={styles.backBtn} 
          onClick={() => setSelectedPin(null)}
          style={{ marginBottom: '15px', color: '#2563eb', fontWeight: 'bold', border: 'none', background: 'none' }}
        >
          ← 목록으로 돌아가기
        </button>
        <div className={styles.detailHeader}>
          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            {selectedPin.property_type || '매물'}
          </span>
          <h3 style={{ fontSize: '1.3rem', margin: '10px 0' }}>{selectedPin.address}</h3>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '10px', marginBottom: '20px' }}>
          <strong style={{ fontSize: '1.1rem', color: '#047857' }}>{getPriceString(selectedPin)}</strong>
        </div>
        <div className={styles.memoTitle} style={{ fontWeight: 'bold', marginBottom: '10px' }}>상세 설명</div>
        <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', minHeight: '100px', whiteSpace: 'pre-wrap' }}>
          {selectedPin.notes || "등록된 메모가 없습니다."}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.panelContainer} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 고정 헤더 */}
      <div className={styles.panelHeader} style={{ flexShrink: 0 }}>
        <h2 className={styles.headerTitle}>
          {isCreating ? '새 매물 등록' : (isEditMode ? '매물 수정' : (isMobile && selectedPin ? '매물 상세' : '매물 리스트'))}
        </h2>
      </div>
      
      {/* 가변 컨텐츠 영역 (scroll-box 클래스 적용 확인) */}
      <div className={`${styles.panelContent} scroll-box`}>
        {/* 분기 1: 등록/수정 모드 */}
        {(isCreating || isEditMode) && isMobile ? (
          <div className={styles.formWrapper}><PinForm mode={isEditMode ? 'edit' : 'create'} /></div>
        ) : 
        /* 분기 2: 모바일에서 매물이 선택되었을 때 (상세 뷰) */
        isMobile && selectedPin ? (
          renderMobileDetail()
        ) : (
        /* 분기 3: 기본 리스트 뷰 */
          <ul className={styles.listContainer}>
            {(!displayNodes || displayNodes.length === 0) ? (
              <li className={styles.emptyMsg}>매물이 없습니다.</li>
            ) : (
              displayNodes.map((node) => {
                if (node.type === 'SINGLE') return renderItem(node.data, false);
                
                // 그룹(STACK/CLUSTER) 처리
                const groupIds = node.items.map(i => String(i.id));
                const isGroupActive = selectedPin && groupIds.includes(String(selectedPin.id));
                const isExpanded = expandedKeys[node.id];

                return (
                  <li key={node.id} className={styles.groupItem}>
                    <div 
                      onClick={() => toggleGroup(node.id)} 
                      className={`${styles.groupHeader} ${isGroupActive ? styles.active : ''}`}
                    >
                      <div className={styles.groupInfo}>
                        <div className={`${styles.countBadge} ${node.type === 'STACK' ? styles.stack : styles.cluster}`}>
                          {node.items.length}
                        </div>
                        <div className={styles.groupTitle}>
                          {node.type === 'STACK' ? (node.title || '동일위치 매물') : '지역 묶음'}
                        </div>
                      </div>
                      <div className={styles.arrowIcon}>{isExpanded ? '▲' : '▼'}</div>
                    </div>
                    {/* 스택 내부 아이템 렌더링 */}
                    {isExpanded && (
                      <ul className={styles.childList}>
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