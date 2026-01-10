/**
 * [Revision Info]
 * Rev: 39.0 (Perfect Center Alignment & Line Divider)
 * Date: 2026-01-09
 * Author: AI Assistant (PropTech Expert)
 * [Improvements]
 * 1. dividerStyle을 1px 두께의 세로선으로 변경하여 텍스트 가독성 확보.
 * 2. select 내 텍스트 정렬을 textAlignLast: center를 통해 강제 중앙 정렬.
 * 3. 요소 간 간격(gap) 및 패딩을 조절하여 파란색 테두리가 텍스트를 예쁘게 감싸도록 보정.
 */
import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';

const MapFilters = () => {
  const { 
    filterType, setFilterType, 
    filterTransaction, setFilterTransaction,
    filterStatus, setFilterStatus,
    zoomLevel 
  } = useMap();

  // 필터 컨테이너 스타일 (중앙 상단 화이트 바)
  const containerStyle = {
    position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 20, display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)', padding: '6px 20px',
    borderRadius: '40px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #eee',
    boxSizing: 'border-box', whiteSpace: 'nowrap'
  };

  // 선택 상자 스타일 (파란색 테두리 및 완벽 중앙 정렬)
  const selectStyle = {
    border: '2px solid transparent', 
    background: 'none', 
    fontSize: '14px', 
    fontWeight: '800',
    color: '#1f2937', 
    outline: 'none', 
    cursor: 'pointer', 
    padding: '4px 10px',
    borderRadius: '20px',
    textAlign: 'center',
    textAlignLast: 'center', // Select 박스 텍스트 중앙 정렬 핵심
    transition: 'all 0.2s ease',
    appearance: 'none', // 기본 화살표 숨김 (깔끔한 중앙 정렬을 위해)
    minWidth: '90px'
  };

  // 마우스 포커스 시 효과
  const handleFocus = (e) => { e.target.style.borderColor = '#2563eb'; };
  const handleBlur = (e) => { e.target.style.borderColor = 'transparent'; };

  // 세로 구분선 스타일 (정사각형 박스 방지, 얇은 선 적용)
  const dividerStyle = { 
    width: '1px', 
    height: '14px', 
    backgroundColor: '#e5e7eb',
    margin: '0 8px',
    flexShrink: 0
  };

  return (
    <div style={containerStyle}>
      {/* 줌 레벨 표시 */}
      <div style={{fontSize:'12px', color:'#9ca3af', fontWeight:'800', padding: '0 8px'}}>
        LV.{zoomLevel}
      </div>
      
      <div style={dividerStyle} />

      {/* 1. 전체 유형 필터 */}
      <select 
        style={selectStyle} 
        value={filterType} 
        onChange={(e) => setFilterType(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <option value="전체">전체유형</option>
        <option value="아파트">아파트</option>
        <option value="오피스텔">오피스텔</option>
        <option value="빌라">빌라</option>
        <option value="상가">상가</option>
        <option value="사무실">사무실</option>
        <option value="토지">토지</option>
      </select>

      <div style={dividerStyle} />

      {/* 2. 전체 거래 필터 */}
      <select 
        style={selectStyle} 
        value={filterTransaction} 
        onChange={(e) => setFilterTransaction(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <option value="전체">전체거래</option>
        <option value="매매">매매</option>
        <option value="전세">전세</option>
        <option value="월세">월세</option>
      </select>

      <div style={dividerStyle} />

      {/* 3. 전체 상태 필터 */}
      <select 
        style={selectStyle} 
        value={filterStatus} 
        onChange={(e) => setFilterStatus(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <option value="전체">전체상태</option>
        <option value="거래전">거래전</option>
        <option value="거래중">거래중</option>
        <option value="거래완료">완료</option>
      </select>
    </div>
  );
};

export default MapFilters;