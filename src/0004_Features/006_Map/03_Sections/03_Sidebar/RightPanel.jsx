import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import PinForm from './PinForm';
import StackForm from './StackForm';

const RightPanel = () => {
  const { 
    selectedPin, isEditMode, isCreating, resetSelection, setIsEditMode,
    isStackMode 
  } = useMap();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  if (isMobile) return null;

  const isVisible = !!selectedPin || isEditMode || isCreating || isStackMode;
  
  if (!isVisible) return null;

  const panelStyle = {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
    backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, overflowY: 'auto', borderLeft: '1px solid #e5e7eb',
    paddingBottom: '100px', boxSizing: 'border-box'
  };

  // ★ [수정됨] 상세화면 가격 표시 (월세 포맷 변경: 보증금/월세)
  const renderPriceInfo = (pin) => {
    if (!pin) return '-';
    const fmt = n => Number(n || 0).toLocaleString();

    const priceRows = [];

    // 1. 매매
    if (pin.is_sale) {
      priceRows.push({ 
        label: '매매', 
        text: `${fmt(pin.sale_price)}`, 
        color: '#ef4444', 
        bg: '#fee2e2' 
      });
    }

    // 2. 전세
    if (pin.is_jeonse) {
      priceRows.push({ 
        label: '전세', 
        text: `${fmt(pin.jeonse_deposit)}`, 
        color: '#3b82f6', 
        bg: '#dbeafe' 
      });
    }

    // 3. 월세 (보증금 / 월세)
    if (pin.is_rent) {
      const deposit = pin.rent_deposit ? fmt(pin.rent_deposit) : '0';
      const rent = fmt(pin.rent_amount);
      const text = `${deposit} / ${rent}`;
      
      priceRows.push({ 
        label: '월세', 
        text, 
        color: '#10b981', 
        bg: '#d1fae5' 
      });
    }

    if (priceRows.length === 0) return <span>-</span>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {priceRows.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              backgroundColor: p.bg, color: p.color, padding: '4px 8px', 
              borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center'
            }}>
              {p.label}
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#374151' }}>
              {p.text}
            </span>
          </div>
        ))}

        {pin.key_money > 0 && (
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', borderTop: '1px dashed #e5e7eb', paddingTop: '10px' }}>
             <span style={{ 
                backgroundColor: '#f3f4f6', color: '#6b7280', padding: '4px 8px', 
                borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center'
             }}>
               권리금
             </span>
             <span style={{ fontSize: '1rem', color: '#4b5563' }}>
               {fmt(pin.key_money)}
             </span>
           </div>
        )}
      </div>
    );
  };

  const getTradeTypeString = (pin) => {
    const types = [];
    if (pin.is_sale) types.push('매매');
    if (pin.is_jeonse) types.push('전세');
    if (pin.is_rent) types.push('월세');
    return types.join(', ') || '-';
  };

  const renderDetailRow = (label, value, isLongText = false) => (
    <div key={label} style={{display:'flex', marginBottom:'12px', borderBottom:'1px solid #f9fafb', paddingBottom:'8px'}}>
        <span style={{width:'80px', color:'#6b7280', fontSize:'0.9rem', fontWeight:'600', flexShrink: 0}}>{label}</span>
        <span style={{
          flex:1, color:'#111827', fontSize:'0.95rem', 
          whiteSpace: isLongText ? 'pre-wrap' : 'normal',
          lineHeight: isLongText ? '1.5' : '1.2'
        }}>
          {value || '-'}
        </span>
    </div>
  );

  return (
    <div style={panelStyle}>
      {isStackMode ? (
        <StackForm />
      ) : (isCreating || isEditMode) ? (
        <PinForm mode={isEditMode ? 'edit' : 'create'} />
      ) : (
        selectedPin && selectedPin.id && (
            <div style={{padding:'24px'}}>
               <div style={{marginBottom:'20px'}}>
                 <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                   <span style={{backgroundColor:'#eff6ff', color:'#2563eb', padding:'4px 8px', borderRadius:'4px', fontSize:'0.8rem', fontWeight:'bold'}}>
                     {selectedPin.property_type || '매물'}
                   </span>
                 </div>
                 <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '5px 0', color:'#111827', lineHeight:'1.3' }}>
                   {selectedPin.building_name || selectedPin.keywords || '매물 상세 정보'}
                 </h2>
                 <p style={{color:'#6b7280', fontSize:'0.9rem'}}>{selectedPin.address} {selectedPin.detailed_address}</p>
               </div>

               <div style={{padding:'20px', backgroundColor:'#f0fdf4', borderRadius:'12px', marginBottom:'24px', border:'1px solid #dcfce7'}}>
                  {renderPriceInfo(selectedPin)}
               </div>

               {selectedPin.image_urls && selectedPin.image_urls.length > 0 && (
                 <div style={{ marginBottom: '30px' }}>
                   <h3 style={{fontSize:'1rem', fontWeight:'bold', marginBottom:'10px', color:'#374151'}}>매물 사진</h3>
                   <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
                     {selectedPin.image_urls.map((url, idx) => (
                       <div key={idx} style={{ flexShrink: 0, width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                         <img 
                           src={url} 
                           alt={`매물사진-${idx}`} 
                           style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                           onClick={() => window.open(url, '_blank')} 
                         />
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <h3 style={{fontSize:'1rem', fontWeight:'bold', borderBottom:'2px solid #f3f4f6', paddingBottom:'8px', marginBottom:'16px'}}>매물 정보</h3>
               {renderDetailRow("거래 유형", getTradeTypeString(selectedPin))}
               {renderDetailRow("면적", selectedPin.area ? `${selectedPin.area}평` : '')}
               {renderDetailRow("층수", selectedPin.floor ? `${selectedPin.floor}층` : '')}
               {renderDetailRow("관리비", selectedPin.maintenance_fee ? `${Number(selectedPin.maintenance_fee).toLocaleString()}만원` : '')}
               {renderDetailRow("메모", selectedPin.notes, true)}
               {renderDetailRow("메인 키워드", selectedPin.keywords)}

               <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                 <button 
                   onClick={() => alert("AI 입지분석 리포트 기능 준비 중입니다.")}
                   style={{
                     width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
                     background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                     color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                     marginBottom: '12px', boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)'
                   }}
                 >
                   ✨ AI 입지분석
                 </button>

                 <div style={{ display: 'flex', gap: '10px' }}>
                   <button 
                     onClick={() => setIsEditMode(true)}
                     style={{
                       flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db',
                       backgroundColor: 'white', color: '#374151', fontSize: '0.95rem', fontWeight: '600',
                       cursor: 'pointer'
                     }}
                   >
                     매물 수정
                   </button>
                   <button 
                     onClick={resetSelection}
                     style={{
                       flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db',
                       backgroundColor: '#f3f4f6', color: '#374151', fontSize: '0.95rem', fontWeight: '600',
                       cursor: 'pointer'
                     }}
                   >
                     닫기
                   </button>
                 </div>
               </div>
            </div>
        )
      )}
    </div>
  );
};

export default RightPanel;