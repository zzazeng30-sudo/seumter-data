/**
 * [Revision Info]
 * Rev: 1.3
 * Date: 2026-01-08
 * Author: AI Assistant (PropTech Expert)
 * * [Improvements]
 * 1. Monolithic Code Refactoring: Form, List, Filter, Hook 분리 적용
 * 2. 200줄 이내로 코드 축소하여 유지보수성 극대화
 * 3. 클라이언트 사이드 필터링 로직을 useMemo로 최적화
 * * [Logic Change Log]
 * - Before: 460줄의 단일 파일에서 모든 로직 처리
 * - After: 하위 컴포넌트 조립 및 필터링 로직만 담당
 */

import React, { useEffect, useState, useMemo } from 'react';
import styles from './PropertyPage.module.css';

// 분리된 모듈 임포트
import { useProperty } from './hooks/useProperty';
import PropertyForm from './components/PropertyForm';
import PropertyList from './components/PropertyList';
import PropertyFilter from './components/PropertyFilter';

export default function PropertyPage({ session }) {
  // 1. Data Logic (Custom Hook)
  const { properties, loading, fetchProperties, addProperty, deleteProperty } = useProperty(session);

  // 2. Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterMode, setFilterMode] = useState('ALL');
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [priceFilter, setPriceFilter] = useState({ 
    lumpSumMin: '', lumpSumMax: '', rentMin: '', rentMax: '' 
  });

  // 3. Initial Load
  useEffect(() => {
    // 카카오맵 로드 여부 체크 후 데이터 페치
    if (window.kakao && window.kakao.maps) {
      fetchProperties();
    } else {
      // 카카오맵이 없어도 데이터는 불러옴
      fetchProperties();
    }
  }, [fetchProperties]);

  // 4. Filtering Logic (Client-Side) - useMemo로 최적화
  const filteredProperties = useMemo(() => {
    return properties.filter(pin => {
      // 4-1. 텍스트 검색
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = 
        (pin.address || '').toLowerCase().includes(searchLower) ||
        (pin.building_name || '').toLowerCase().includes(searchLower) ||
        (pin.notes || '').toLowerCase().includes(searchLower);
      if (!matchSearch) return false;

      // 4-2. 유형 필터
      if (filterType !== 'ALL' && pin.property_type !== filterType) return false;

      // 4-3. 거래 방식 필터
      if (filterMode === 'SALE' && !pin.is_sale) return false;
      if (filterMode === 'JEONSE' && !pin.is_jeonse) return false;
      if (filterMode === 'RENT' && !pin.is_rent) return false;

      // 4-4. 가격 필터 (간소화된 로직 적용)
      const minLump = Number(priceFilter.lumpSumMin || 0);
      const maxLump = Number(priceFilter.lumpSumMax || 9999999999);
      
      // 해당 매물의 대표 가격들 추출
      const prices = [];
      if (pin.is_sale) prices.push(pin.sale_price || 0);
      if (pin.is_jeonse) prices.push(pin.jeonse_deposit || 0);
      if (pin.is_rent) prices.push(pin.rent_deposit || 0);
      
      const matchPrice = prices.some(p => p >= minLump && p <= maxLump);
      if ((priceFilter.lumpSumMin || priceFilter.lumpSumMax) && !matchPrice) return false;

      return true;
    });
  }, [properties, searchQuery, filterType, filterMode, priceFilter]);

  return (
    <div className={styles.pageContainer}>
      {/* 좌측 사이드바: 매물 등록 폼 */}
      <PropertyForm 
        onAddProperty={addProperty} 
        session={session} 
        loading={loading} 
      />

      {/* 우측 메인: 리스트 및 필터 */}
      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>
          매물 리스트 (총 {filteredProperties.length}건 / 전체 {properties.length}건)
        </h2>

        <PropertyFilter 
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          filterType={filterType} setFilterType={setFilterType}
          filterMode={filterMode} setFilterMode={setFilterMode}
          priceFilter={priceFilter} setPriceFilter={setPriceFilter}
          showPriceFilter={showPriceFilter} setShowPriceFilter={setShowPriceFilter}
        />

        <PropertyList 
          properties={filteredProperties} 
          onDelete={deleteProperty}
          loading={loading}
        />
      </section>
    </div>
  );
}