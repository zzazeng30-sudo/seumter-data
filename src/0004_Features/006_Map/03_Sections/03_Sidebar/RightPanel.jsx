import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import PinForm from './PinForm';

const RightPanel = () => {
  const { 
    selectedPin, isEditMode, isCreating, resetSelection 
  } = useMap();

  // 1. 현재 화면 너비 상태 관리
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. 모바일 여부 판정 (768px 이하)
  const isMobile = windowWidth <= 768;

  // 3. [핵심] 모바일이면 어떤 조건에서도 패널을 그리지 않고 즉시 종료
  if (isMobile) {
    return null;
  }

  // 4. PC 환경에서의 표시 조건
  const isVisible = !!selectedPin || isEditMode || isCreating;
  if (!isVisible) return null;

  const panelStyle = {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
    backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, overflowY: 'auto', borderLeft: '1px solid #e5e7eb'
  };

  // 가격 포맷 헬퍼
  const getPriceString = (pin) => {
    if (!pin) return '-';
    const fmt = n => Number(n || 0).toLocaleString();
    if (pin.is_sale) return `매매 ${fmt(pin.sale_price)}만원`;
    if (pin.is_jeonse) return `전세 ${fmt(pin.jeonse_deposit)}만원`;
    if (pin.is_rent) {
      return `월세 ${fmt(pin.rent_amount)} | 보증금 ${fmt(pin.rent_deposit)} ${pin.key_money ? `| 권리금 ${fmt(pin.key_money)}` : ''}`;
    }
    return '-';
  };

  const renderDetailRow = (label, value) => (
    <div key={label} style={{display:'flex', marginBottom:'10px', borderBottom:'1px solid #f9fafb', paddingBottom:'6px'}}>
        <span style={{width:'100px', color:'#6b7280', fontSize:'0.9rem', fontWeight:'500'}}>{label}</span>
        <span style={{flex:1, color:'#111827', fontSize:'0.95rem'}}>{value || '-'}</span>
    </div>
  );

  return (
    <div style={panelStyle}>
      {/* 상단 닫기 버튼 */}
      <div style={{display:'flex', justifyContent:'flex-end', padding:'10px'}}>
        <button onClick={resetSelection} style={{ cursor: 'pointer', fontSize: '1.5rem', border: 'none', background: 'none', color:'#666' }}>&times;</button>
      </div>
      
      {(isCreating || isEditMode) ? (
        <PinForm mode={isEditMode ? 'edit' : 'create'} />
      ) : (
        selectedPin && selectedPin.id && (
            <div style={{padding:'0 24px 40px'}}>
               <div style={{marginBottom:'20px'}}>
                 <span style={{backgroundColor:'#eff6ff', color:'#2563eb', padding:'4px 8px', borderRadius:'4px', fontSize:'0.8rem', fontWeight:'bold'}}>
                   {selectedPin.property_type || '매물'}
                 </span>
                 <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '10px 0 5px', color:'#111827', lineHeight:'1.3' }}>
                   {selectedPin.building_name || selectedPin.keywords || '매물 상세 정보'}
                 </h2>
                 <p style={{color:'#6b7280', fontSize:'0.9rem'}}>{selectedPin.address} {selectedPin.detailed_address}</p>
               </div>

               <div style={{padding:'20px', backgroundColor:'#f0fdf4', borderRadius:'12px', marginBottom:'24px', border:'1px solid #dcfce7'}}>
                  <h3 style={{fontSize:'1.1rem', fontWeight:'bold', color:'#047857', margin:0}}>
                    {getPriceString(selectedPin)}
                  </h3>
               </div>

               <h3 style={{fontSize:'1rem', fontWeight:'bold', borderBottom:'2px solid #f3f4f6', paddingBottom:'8px', marginBottom:'16px'}}>매물 정보</h3>
               {renderDetailRow("메인 키워드", selectedPin.keywords)}
               {renderDetailRow("거래 유형", selectedPin.is_sale ? '매매' : (selectedPin.is_jeonse ? '전세' : '월세'))}
               {renderDetailRow("면적", selectedPin.area ? `${selectedPin.area}평` : '')}
               {renderDetailRow("층수", selectedPin.floor ? `${selectedPin.floor}층` : '')}

               <h3 style={{fontSize:'1rem', fontWeight:'bold', borderBottom:'2px solid #f3f4f6', paddingBottom:'8px', marginBottom:'16px', marginTop:'30px'}}>상세 설명</h3>
               <div style={{whiteSpace:'pre-wrap', lineHeight:'1.6', color:'#374151', minHeight:'100px', backgroundColor:'#fff', border:'1px solid #e5e7eb', padding:'12px', borderRadius:'8px', fontSize:'0.95rem'}}>
                   {selectedPin.notes || '등록된 메모가 없습니다.'}
               </div>
            </div>
        )
      )}
    </div>
  );
};

export default RightPanel;