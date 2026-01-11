/**
 * [Revision: 13.0]
 * - DB 컬럼명 불일치 수정 (category -> property_type)
 * - 거래 유형 및 가격 저장 로직을 PinForm.jsx와 동일하게 통일 (is_sale, sale_price 등)
 */
import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import { supabase } from '../../../../0005_Lib/supabaseClient';

export default function StackForm() {
  const { 
    stackParentPin, 
    closeStackMode, 
    fetchPins
  } = useMap();

  const [formData, setFormData] = useState({
    stackTitle: '', 
    detailedAddress: '',
    
    // 부모 정보
    buildingName: '', 
    propertyType: '', // [수정] category -> propertyType
    
    // 거래 정보
    dealType: '매매', // 내부 로직용 (DB 저장 시엔 is_sale 등으로 변환)
    price: '',        // 매매가 or 전세가 or 보증금
    monthlyRent: '',  // 월세
    keyMoney: '',
    area: '',
    floor: '',
    maintenanceFee: '',
    keywords: '',
    notes: ''
  });

  useEffect(() => {
    if (stackParentPin) {
      setFormData(prev => ({
        ...prev,
        buildingName: stackParentPin.building_name || '',
        propertyType: stackParentPin.property_type || '아파트', // [수정] property_type 사용
        stackTitle: stackParentPin.title || stackParentPin.building_name || '', 
      }));
    }
  }, [stackParentPin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // ★ [핵심 수정] PinForm.jsx와 동일한 컬럼 구조로 변환
      const payload = {
        user_id: user.id,
        lat: stackParentPin.lat,
        lng: stackParentPin.lng,
        
        // 1. 기본 정보
        title: formData.stackTitle, // (DB에 title 컬럼이 없다면 building_name에 합쳐야 함)
        building_name: formData.buildingName,
        detailed_address: formData.detailedAddress,
        property_type: formData.propertyType, // ★ category -> property_type 수정
        
        // 2. 거래 유형 (Boolean 플래그)
        is_sale: formData.dealType === '매매',
        is_jeonse: formData.dealType === '전세',
        is_rent: formData.dealType === '월세',

        // 3. 가격 정보 (선택된 타입에 따라 매핑)
        sale_price: formData.dealType === '매매' ? (parseInt(formData.price) || 0) : 0,
        jeonse_deposit: formData.dealType === '전세' ? (parseInt(formData.price) || 0) : 0,
        rent_deposit: formData.dealType === '월세' ? (parseInt(formData.price) || 0) : 0, // 보증금
        rent_amount: formData.dealType === '월세' ? (parseInt(formData.monthlyRent) || 0) : 0,
        key_money: parseInt(formData.keyMoney) || 0,

        // 4. 상세 정보
        area: formData.area ? parseFloat(formData.area) : 0,
        floor: formData.floor,
        maintenance_fee: formData.maintenanceFee ? parseInt(formData.maintenanceFee) : 0,
        keywords: formData.keywords, // 문자열 그대로 저장 (PinForm과 동일)
        notes: formData.notes,
        status: '거래전' // 기본값 설정
      };

      // 테이블 이름 'pins' 확인
      const { error } = await supabase.from('pins').insert(payload);

      if (error) throw error;

      alert('스택 매물이 등록되었습니다!');
      await fetchPins(); 
      closeStackMode(); 

    } catch (error) {
      console.error('스택 등록 에러:', error);
      alert('등록 에러: ' + error.message);
    }
  };

  // 스타일 관련
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', marginTop: '12px' };
  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' };
  const readOnlyStyle = { ...inputStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };

  return (
    <div style={{ padding: '24px 24px 150px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>스택 매물 등록</h2>
        <button onClick={closeStackMode} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 스택 제목 */}
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0369a1', marginBottom: '6px' }}>
            📌 스택 제목 (목록 표시용)
          </label>
          <input 
            name="stackTitle" 
            value={formData.stackTitle} 
            onChange={handleChange}
            placeholder="예: 배방자이 1차 묶음" 
            style={{ width: '100%', padding: '10px', border: '2px solid #0ea5e9', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }} 
            required
          />
        </div>

        {/* 기본 정보 */}
        <label style={labelStyle}>매물 유형 (고정)</label>
        <input value={formData.propertyType} readOnly style={readOnlyStyle} />

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>건물명 (고정)</label>
            <input value={formData.buildingName} readOnly style={readOnlyStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>동/호수 (입력)</label>
            <input name="detailedAddress" value={formData.detailedAddress} onChange={handleChange} placeholder="101-202" style={inputStyle} required />
          </div>
        </div>

        {/* 거래 정보 */}
        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '5px', marginTop: '30px', marginBottom: '15px' }}>거래 정보</h3>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          {['매매', '전세', '월세'].map(type => (
            <button 
              key={type} 
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, dealType: type, price: '', monthlyRent: '' }))}
              style={{
                flex: 1, padding: '10px', borderRadius: '4px',
                border: '1px solid #d1d5db',
                backgroundColor: formData.dealType === type ? '#2563eb' : 'white',
                color: formData.dealType === type ? 'white' : '#374151',
                fontWeight: formData.dealType === type ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>
              {formData.dealType === '매매' ? '매매가' : formData.dealType === '전세' ? '전세금' : '보증금'} (만원)
            </label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="금액 입력" style={inputStyle} />
          </div>
          {formData.dealType === '월세' && (
             <div><label style={labelStyle}>월세 (만원)</label><input type="number" name="monthlyRent" value={formData.monthlyRent} onChange={handleChange} style={inputStyle} /></div>
          )}
          <div>
            <label style={labelStyle}>권리금 (만원)</label>
            <input type="number" name="keyMoney" value={formData.keyMoney} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        {/* 상세 정보 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>평수</label><input name="area" value={formData.area} onChange={handleChange} style={inputStyle} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>층수</label><input name="floor" value={formData.floor} onChange={handleChange} style={inputStyle} /></div>
        </div>
        
        <label style={labelStyle}>관리비</label>
        <input type="number" name="maintenanceFee" value={formData.maintenanceFee} onChange={handleChange} style={inputStyle} />

        <button type="submit" style={{ width: '100%', padding: '14px', marginTop: '30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
          스택 등록 완료
        </button>
      </form>
    </div>
  );
}