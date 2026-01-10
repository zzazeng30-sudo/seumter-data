/**
 * [Revision: 65.0]
 * - 거래 정보 통합: 매매/전세/월세 모두 [매매/전세/보증금], [월세], [권리금] 필드 상시 노출
 * - 레이아웃: 건물명 | 상세주소 반반 배치 유지
 * - 상태값: 거래전/중/완료 상태 선택 유지
 */
import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import { propertyService } from '../../../../services/propertyService'; 
import { authService } from '../../../../services/authService';

const PinForm = ({ mode }) => {
  const { 
    selectedPin, resetSelection, fetchPins, 
    form, setForm, handleChange, handleTypeSelect, fillForm, resetForm 
  } = useMap(); 
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPin) {
      if (isEdit) {
        fillForm(selectedPin); 
      } else {
        resetForm(); 
        if (!selectedPin.address && window.kakao && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(selectedPin.lng, selectedPin.lat, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
              setForm(prev => ({ ...prev, address: addr }));
            }
          });
        } else {
          setForm(prev => ({ ...prev, address: selectedPin.address || '' }));
        }
      }
    }
  }, [selectedPin, isEdit, fillForm, resetForm, setForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPin) return;
    setLoading(true);
    try {
      const { session } = await authService.getSession();
      if (!session) throw new Error("세션 만료");

      const payload = {
        user_id: session.user.id,
        lat: selectedPin.lat, lng: selectedPin.lng,
        address: form.address, detailed_address: form.detailedAddress,
        building_name: form.buildingName, property_type: form.propertyType,
        keywords: form.keywords,
        is_sale: form.transactionType === '매매', 
        is_jeonse: form.transactionType === '전세', 
        is_rent: form.transactionType === '월세',
        // 모든 금액 필드를 숫자로 변환하여 전송
        sale_price: Number(form.price) || 0,
        jeonse_deposit: Number(form.price) || 0,
        rent_deposit: Number(form.price) || 0,
        rent_amount: Number(form.monthlyRent) || 0,
        key_money: Number(form.keyMoney) || 0, 
        area: form.area,
        maintenance_fee: Number(form.maintenanceFee) || 0, 
        floor: form.floor,
        room_count: Number(form.roomCount) || 0, 
        bathroom_count: Number(form.bathroomCount) || 0,
        notes: form.notes,
        status: form.status 
      };

      if (isEdit) {
        await propertyService.updateProperty(selectedPin.id, payload);
        alert("수정되었습니다.");
      } else {
        await propertyService.createProperty(payload);
        alert("등록되었습니다.");
      }
      await fetchPins(); 
      resetSelection(); 
    } catch (err) { alert("오류: " + err.message); } finally { setLoading(false); }
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', marginTop: '12px' };
  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' };
  const btnStyle = (isSelected, activeColor = '#2563eb') => ({
    flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db',
    backgroundColor: isSelected ? activeColor : 'white', color: isSelected ? 'white' : '#374151',
    fontWeight: isSelected ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
  });

  return (
    <form onSubmit={handleSubmit} style={{ padding: '24px', paddingBottom: '50px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '20px' }}>
        {isEdit ? '매물 수정' : '새 매물 등록'}
      </h2>
      
      {/* 거래 상태 */}
      <label style={labelStyle}>거래 상태</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <button type="button" style={btnStyle(form.status === '거래전', '#9ca3af')} onClick={() => handleTypeSelect('status', '거래전')}>거래전</button>
        <button type="button" style={btnStyle(form.status === '거래중', '#2563eb')} onClick={() => handleTypeSelect('status', '거래중')}>거래중</button>
        <button type="button" style={btnStyle(form.status === '거래완료', '#ef4444')} onClick={() => handleTypeSelect('status', '거래완료')}>완료</button>
      </div>

      {/* 매물 유형 */}
      <label style={labelStyle}>매물 유형</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {['아파트', '오피스텔', '빌라', '상가', '사무실', '토지'].map(type => (
          <button type="button" key={type} style={btnStyle(form.propertyType === type)} onClick={() => handleTypeSelect('propertyType', type)}>{type}</button>
        ))}
      </div>

      {/* 건물명 | 상세주소 반반 배치 */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...labelStyle, marginTop: 0 }}>건물명</label>
          <input name="buildingName" value={form.buildingName} onChange={handleChange} style={inputStyle} placeholder="건물명" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...labelStyle, marginTop: 0 }}>동/호수</label>
          <input name="detailedAddress" value={form.detailedAddress} onChange={handleChange} style={inputStyle} placeholder="101-101" />
        </div>
      </div>

      <label style={labelStyle}>기본 주소</label>
      <input value={form.address} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />

      <h3 style={{fontSize:'1rem', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'30px'}}>거래 및 가격 정보</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom:'15px', marginTop:'10px' }}>
        {['매매', '전세', '월세'].map(type => (
          <button type="button" key={type} style={btnStyle(form.transactionType === type)} onClick={() => handleTypeSelect('transactionType', type)}>{type}</button>
        ))}
      </div>

      {/* ★ 모든 거래 유형 공통 입력 필드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* 1. 매매가 / 전세가 / 보증금 (라벨만 가변) */}
        <div>
          <label style={{ ...labelStyle, marginTop: 0 }}>
            {form.transactionType === '매매' ? '매매가격' : form.transactionType === '전세' ? '전세가격' : '보증금'} (만원)
          </label>
          <input type="number" name="price" value={form.price} onChange={handleChange} style={inputStyle} placeholder="금액 입력" />
        </div>

        {/* 2. 월세가격 (항상 노출하되 월세가 아닐 땐 선택적 입력 가능) */}
        <div>
          <label style={{ ...labelStyle, marginTop: 0 }}>월세가격 (만원)</label>
          <input type="number" name="monthlyRent" value={form.monthlyRent} onChange={handleChange} style={inputStyle} placeholder="월세 없을 시 0" />
        </div>

        {/* 3. 권리금 (항상 노출) */}
        <div>
          <label style={{ ...labelStyle, marginTop: 0 }}>권리금 (만원)</label>
          <input type="number" name="keyMoney" value={form.keyMoney} onChange={handleChange} style={inputStyle} placeholder="권리금 없을 시 0" />
        </div>
      </div>

      {/* 평수, 층수, 관리비 가로 배치 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <div style={{ flex: 1 }}><label style={labelStyle}>평수</label><input name="area" value={form.area} onChange={handleChange} style={inputStyle} placeholder="평" /></div>
        <div style={{ flex: 1 }}><label style={labelStyle}>층수</label><input name="floor" value={form.floor} onChange={handleChange} style={inputStyle} placeholder="층" /></div>
        <div style={{ flex: 1 }}><label style={labelStyle}>관리비</label><input type="number" name="maintenanceFee" value={form.maintenanceFee} onChange={handleChange} style={inputStyle} /></div>
      </div>

      {/* 상세 정보 */}
      <h3 style={{fontSize:'1rem', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'30px'}}>상세 정보</h3>
      <label style={labelStyle}>키워드 (지도 표시)</label>
      <input name="keywords" value={form.keywords} onChange={handleChange} style={inputStyle} placeholder="10자 이내 (급매, 역세권 등)" />
      
      <label style={labelStyle}>메모</label>
      <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} style={{ ...inputStyle, height: 'auto' }} placeholder="상세 내용 입력" />

      <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
        {loading ? '저장 중...' : (isEdit ? '수정 완료' : '등록 완료')}
      </button>
    </form>
  );
};

export default PinForm;