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
    setSelectedPin(pin);
  };

  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  // ★ [수정됨] 포맷 변경: 매 217 | 월 1000/30 | 권 33,333
  const formatSimplePrice = (pin) => {
    if (!pin) return '-';
    const fmt = n => Number(n || 0).toLocaleString();
    const parts = [];

    // 1. 매매
    if (pin.is_sale) {
      parts.push(`매 ${fmt(pin.sale_price)}`);
    } 
    
    // 2. 전세
    if (pin.is_jeonse) {
      parts.push(`전 ${fmt(pin.jeonse_deposit)}`);
    } 
    
    // 3. 월세: 보증금/월세 (보증금 없으면 0 표시)
    if (pin.is_rent) {
      const deposit = pin.rent_deposit ? fmt(pin.rent_deposit) : '0';
      const rent = fmt(pin.rent_amount);
      parts.push(`월 ${deposit}/${rent}`);
    }

    // 4. 권리금
    // 배열을 ' | '로 합칩니다.
    let priceStr = parts.join(' | ');
    
    if (pin.key_money > 0) {
      if (priceStr) priceStr += ' | ';
      priceStr += `권 ${fmt(pin.key_money)}`;
    }

    return priceStr || '-';
  };

  const getPriceString = (pin) => formatSimplePrice(pin);

  const renderItem = (pin, isChild = false) => {
    const isActive = selectedPin && String(selectedPin.id) === String(pin.id);
    const isHovered = Array.isArray(hoveredPinId) 
      ? hoveredPinId.map(String).includes(String(pin.id)) 
      : String(hoveredPinId) === String(pin.id);
    const displayTitle = pin.title || pin.building_name || pin.keywords || '매물';

    return (
      <li 
        key={pin.id} 
        onClick={(e) => { 
          e.stopPropagation(); 
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
         <div className={styles.itemHeader} style={{ display: 'flex', flexDirection:'column', width: '100%', gap:'4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width:'100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <span className={styles.keywords} style={{ fontWeight: pin.title ? 'bold' : 'normal', fontSize:'0.95rem' }}>
                        {truncate(displayTitle, 20)}
                    </span>
                </div>
            </div>
            {/* 가격 표시 */}
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2563eb', textAlign: 'right', marginTop:'2px' }}>
                {formatSimplePrice(pin)}
            </div>
         </div>
         <div className={styles.addressLabel} style={{ marginTop: '4px', color:'#6b7280' }}>{truncate(pin.address, 40)}</div>
      </li>
    );
  };

  const renderMobileDetail = () => {
    if (!selectedPin) return null;
    const mobileTitle = selectedPin.title || selectedPin.building_name || selectedPin.keywords || '매물 상세';

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
          <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
            <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
              {selectedPin.property_type || '매물'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '10px 0 5px' }}>{mobileTitle}</h2>
          <p style={{ fontSize: '1rem', color: '#666', margin: 0 }}>{selectedPin.address}</p>
        </div>
        
        <div style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '10px', marginBottom: '20px', marginTop: '15px' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {selectedPin.is_sale && (
                 <div style={{color:'#ef4444', fontWeight:'bold'}}>
                   매매 {Number(selectedPin.sale_price).toLocaleString()}
                 </div>
              )}
              {selectedPin.is_jeonse && (
                 <div style={{color:'#3b82f6', fontWeight:'bold'}}>
                   전세 {Number(selectedPin.jeonse_deposit).toLocaleString()}
                 </div>
              )}
              {selectedPin.is_rent && (
                 <div style={{color:'#10b981', fontWeight:'bold'}}>
                   {/* 모바일 상세도 통일: 보증금/월세 (보증금 없으면 0) */}
                   월세 {selectedPin.rent_deposit ? Number(selectedPin.rent_deposit).toLocaleString() : '0'} / {Number(selectedPin.rent_amount).toLocaleString()}
                 </div>
              )}
              {selectedPin.key_money > 0 && (
                 <div style={{color:'#6b7280', fontSize:'0.9rem'}}>권리금 {Number(selectedPin.key_money).toLocaleString()}</div>
              )}
           </div>
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
      <div className={styles.panelHeader} style={{ flexShrink: 0 }}>
        <h2 className={styles.headerTitle}>
          {isCreating ? '새 매물 등록' : (isEditMode ? '매물 수정' : (isMobile && selectedPin ? '매물 상세' : '매물 리스트'))}
        </h2>
      </div>
      
      <div className={`${styles.panelContent} scroll-box`}>
        {(isCreating || isEditMode) && isMobile ? (
          <div className={styles.formWrapper}><PinForm mode={isEditMode ? 'edit' : 'create'} /></div>
        ) : 
        isMobile && selectedPin ? (
          renderMobileDetail()
        ) : (
          <ul className={styles.listContainer}>
            {(!displayNodes || displayNodes.length === 0) ? (
              <li className={styles.emptyMsg}>매물이 없습니다.</li>
            ) : (
              displayNodes.map((node) => {
                if (node.type === 'SINGLE') return renderItem(node.data, false);
                const groupIds = node.items.map(i => String(i.id)); 
                const isExpanded = expandedKeys[node.id];
                return (
                  <li key={node.id} className={styles.groupItem}>
                    <div onClick={() => toggleGroup(node.id)} className={`${styles.groupHeader}`}>
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