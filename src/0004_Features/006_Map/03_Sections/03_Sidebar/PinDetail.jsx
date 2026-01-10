/**
 * [Revision Info]
 * Rev: 11.0 (Fix Import Error)
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Fix]
 * 1. useMap 통합 훅 적용
 * 2. 상세 정보 표시 및 수정 모드 전환 기능
 */

import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import { propertyService } from '../../../../services/propertyService';

const PinDetail = () => {
  const { 
    selectedPin, 
    setSelectedPin, 
    setIsEditMode,
    fetchPins 
  } = useMap();

  if (!selectedPin) return null;

  const handleDelete = async () => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await propertyService.deleteProperty(selectedPin.id);
      alert("삭제되었습니다.");
      setSelectedPin(null);
      if (fetchPins) fetchPins();
    }
  };

  const getPrice = () => {
    if (selectedPin.is_sale) return `매매 ${Number(selectedPin.sale_price).toLocaleString()}만원`;
    if (selectedPin.is_jeonse) return `전세 ${Number(selectedPin.jeonse_deposit).toLocaleString()}만원`;
    if (selectedPin.is_rent) return `월세 ${Number(selectedPin.rent_deposit).toLocaleString()} / ${Number(selectedPin.rent_amount).toLocaleString()}만원`;
    return '-';
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>매물 상세</h2>
        <button onClick={() => setSelectedPin(null)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ margin: '20px 0', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
        <div style={{ color: '#2563eb', fontWeight: 'bold', marginBottom: '5px' }}>{selectedPin.property_type}</div>
        <h3 style={{ margin: '0 0 10px 0' }}>{selectedPin.building_name || selectedPin.address}</h3>
        <p style={{ color: '#555' }}>{selectedPin.address} {selectedPin.detailed_address}</p>
        <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px' }}>{getPrice()}</p>
        <p style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>{selectedPin.notes}</p>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setIsEditMode(true)}
          style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          수정
        </button>
        <button 
          onClick={handleDelete}
          style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          삭제
        </button>
      </div>
    </div>
  );
};

export default PinDetail;