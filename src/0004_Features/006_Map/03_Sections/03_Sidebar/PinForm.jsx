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
  
  // 새로 추가된 파일들 (아직 업로드 전)
  const [newFiles, setNewFiles] = useState([]);

  useEffect(() => {
    if (selectedPin) {
      if (isEdit) {
        fillForm(selectedPin); 
        setNewFiles([]); // 수정 모드 시 새 파일 목록 초기화
      } else {
        resetForm(); 
        setNewFiles([]);
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

  // ★ 이미지 압축 함수 (WebP 변환 & 최대 1280px 리사이징)
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280; 
          let width = img.width;
          let height = img.height;

          // 크기가 크면 비율 맞춰 줄이기
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // WebP 포맷, 퀄리티 0.7로 변환
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // 실패 시 원본 반환
            }
          }, 'image/webp', 0.7);
        };
      };
    });
  };

  // ★ 파일 선택 핸들러
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const currentCount = (form.imageUrls ? form.imageUrls.length : 0) + newFiles.length;
    if (currentCount + files.length > 20) {
      alert("사진은 최대 20장까지 등록 가능합니다.");
      return;
    }

    setLoading(true); // 압축 동안 로딩 표시 용도 (버튼 비활성)
    const compressedFiles = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        compressedFiles.push(compressed);
      }
    }
    setNewFiles(prev => [...prev, ...compressedFiles]);
    setLoading(false);
    
    // 같은 파일 다시 선택 가능하게 초기화
    e.target.value = ''; 
  };

  // ★ 이미지 삭제 핸들러
  const handleRemoveImage = (index, isNew) => {
    if (isNew) {
      setNewFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setForm(prev => ({
        ...prev,
        imageUrls: prev.imageUrls.filter((_, i) => i !== index)
      }));
    }
  };

  const handleTabChange = (type) => {
    handleTypeSelect('transactionType', type);
    setForm(prev => ({ 
      ...prev, 
      price: '', monthlyRent: '', keyMoney: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPin) return;
    setLoading(true);
    try {
      const { session } = await authService.getSession();
      if (!session) throw new Error("세션 만료");

      // 1. 새 이미지들을 'pins_photo' 버킷에 업로드
      const uploadedUrls = [];
      if (newFiles.length > 0) {
        for (const file of newFiles) {
          const url = await propertyService.uploadPropertyImage(file);
          uploadedUrls.push(url);
        }
      }

      // 2. 최종 이미지 목록 (기존 URL + 새 URL)
      const finalImageUrls = [...(form.imageUrls || []), ...uploadedUrls];

      const payload = {
        user_id: session.user.id,
        lat: selectedPin.lat, lng: selectedPin.lng,
        address: form.address, detailed_address: form.detailedAddress,
        building_name: form.buildingName, property_type: form.propertyType,
        keywords: form.keywords,
        
        is_sale: form.transactionType === '매매', 
        is_jeonse: form.transactionType === '전세', 
        is_rent: form.transactionType === '월세',
        
        sale_price: form.transactionType === '매매' ? (Number(form.price) || 0) : 0,
        jeonse_deposit: form.transactionType === '전세' ? (Number(form.price) || 0) : 0,
        rent_deposit: form.transactionType === '월세' ? (Number(form.price) || 0) : 0,
        
        rent_amount: Number(form.monthlyRent) || 0,
        key_money: Number(form.keyMoney) || 0, 
        
        area: form.area,
        maintenance_fee: Number(form.maintenanceFee) || 0, 
        floor: form.floor,
        room_count: Number(form.roomCount) || 0, 
        bathroom_count: Number(form.bathroomCount) || 0,
        notes: form.notes,
        status: form.status,
        image_urls: finalImageUrls // DB에 저장될 이미지 URL 배열
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

  const getPriceFields = () => {
    const type = form.transactionType;
    if (type === '월세') {
      return [
        { label: '월세가격', name: 'monthlyRent', placeholder: '금액 입력' },
        { label: '보증금', name: 'price', placeholder: '보증금' },
        { label: '권리금', name: 'keyMoney', placeholder: '권리금 ' }
      ];
    }
    return [
      { label: type === '매매' ? '매매가격' : '전세가격', name: 'price', placeholder: '금액 입력' },
      { label: '보증금', name: 'monthlyRent', placeholder: '보증금' }, 
      { label: '권리금', name: 'keyMoney', placeholder: '권리금' }
    ];
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '24px', paddingBottom: '50px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '20px' }}>
        {isEdit ? '매물 수정' : '새 매물 등록'}
      </h2>
      
      <label style={labelStyle}>거래 상태</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <button type="button" style={btnStyle(form.status === '거래전', '#9ca3af')} onClick={() => handleTypeSelect('status', '거래전')}>거래전</button>
        <button type="button" style={btnStyle(form.status === '거래중', '#2563eb')} onClick={() => handleTypeSelect('status', '거래중')}>거래중</button>
        <button type="button" style={btnStyle(form.status === '거래완료', '#ef4444')} onClick={() => handleTypeSelect('status', '거래완료')}>완료</button>
      </div>

      <label style={labelStyle}>매물 유형</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {['아파트', '오피스텔', '빌라', '상가', '사무실', '토지'].map(type => (
          <button type="button" key={type} style={btnStyle(form.propertyType === type)} onClick={() => handleTypeSelect('propertyType', type)}>{type}</button>
        ))}
      </div>

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
          <button type="button" key={type} style={btnStyle(form.transactionType === type)} onClick={() => handleTabChange(type)}>{type}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {getPriceFields().map((field, index) => (
          <div key={index}>
            <label style={{ ...labelStyle, marginTop: 0 }}>{field.label} (만원)</label>
            <input type="number" name={field.name} value={form[field.name] || ''} onChange={handleChange} style={inputStyle} placeholder={field.placeholder} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <div style={{ flex: 1 }}><label style={labelStyle}>평수</label><input name="area" value={form.area} onChange={handleChange} style={inputStyle} placeholder="평" /></div>
        <div style={{ flex: 1 }}><label style={labelStyle}>층수</label><input name="floor" value={form.floor} onChange={handleChange} style={inputStyle} placeholder="층" /></div>
        <div style={{ flex: 1 }}><label style={labelStyle}>관리비</label><input type="number" name="maintenanceFee" value={form.maintenanceFee} onChange={handleChange} style={inputStyle} /></div>
      </div>

      {/* 상세 정보 섹션 */}
      <h3 style={{fontSize:'1rem', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'30px'}}>상세 정보</h3>
      <label style={labelStyle}>키워드 (지도 표시)</label>
      <input name="keywords" value={form.keywords} onChange={handleChange} style={inputStyle} placeholder="10자 이내 (급매, 역세권 등)" />
      
      <label style={labelStyle}>메모</label>
      <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} style={{ ...inputStyle, height: 'auto' }} placeholder="상세 내용 입력" />

      {/* ★ 사진 업로드 섹션 (상세정보 내 메모 하단) ★ */}
      <label style={labelStyle}>
        사진 (최대 20장) 
        <span style={{fontSize:'11px', color:'#6b7280', marginLeft:'5px', fontWeight: 'normal'}}>
          *자동 압축됨 ({((form.imageUrls?.length || 0) + newFiles.length)}/20)
        </span>
      </label>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
        {/* 1. 기존 저장된 이미지 표시 */}
        {form.imageUrls && form.imageUrls.map((url, idx) => (
          <div key={`old-${idx}`} style={{ position: 'relative', width: '64px', height: '64px' }}>
            <img src={url} alt="매물" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
            <button type="button" onClick={() => handleRemoveImage(idx, false)} 
              style={{ position: 'absolute', top: -6, right: -6, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: '2px solid white', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>✕</button>
          </div>
        ))}
        
        {/* 2. 새로 추가한 이미지 미리보기 */}
        {newFiles.map((file, idx) => (
          <div key={`new-${idx}`} style={{ position: 'relative', width: '64px', height: '64px' }}>
            <img src={URL.createObjectURL(file)} alt="업로드 예정" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '2px solid #3b82f6' }} />
            <button type="button" onClick={() => handleRemoveImage(idx, true)} 
              style={{ position: 'absolute', top: -6, right: -6, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: '2px solid white', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>✕</button>
          </div>
        ))}

        {/* 3. 업로드 버튼 (20장 미만일 때만 표시) */}
        {((form.imageUrls?.length || 0) + newFiles.length) < 20 && (
          <label style={{ 
              width: '64px', height: '64px', border: '1px dashed #d1d5db', borderRadius: '4px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', backgroundColor: '#f9fafb', fontSize: '20px', color: '#9ca3af',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          >
            +
            <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
        {loading ? '저장 중...' : (isEdit ? '수정 완료' : '등록 완료')}
      </button>
    </form>
  );
};

export default PinForm;