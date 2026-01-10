/**
 * [Revision Info]
 * Rev: 1.0
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Improvements]
 * 1. 필터 UI 분리
 * 2. 가격 필터 토글 로직 포함
 */

import React from 'react';
import styles from '../PropertyPage.module.css';

const PropertyFilter = ({
  searchQuery, setSearchQuery,
  filterType, setFilterType,
  filterMode, setFilterMode,
  priceFilter, setPriceFilter,
  showPriceFilter, setShowPriceFilter
}) => {
  
  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceFilter(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className={styles.filterBarContainer}>
      {/* 1. 텍스트 검색 */}
      <input
        className={styles.filterSearchInput}
        type="text"
        placeholder="주소, 건물명, 메모 검색"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* 2. 메인 필터 */}
      <div className={styles.mainFilterGroup}>
        <select className={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">전체 유형</option>
          <option value="아파트">아파트</option>
          <option value="주택">주택</option>
          <option value="상가">상가</option>
          <option value="토지">토지</option>
        </select>

        <div className={styles.transactionModeGroup}>
          {['ALL', 'SALE', 'JEONSE', 'RENT'].map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.transactionModeButton} ${filterMode === mode ? styles.active : ''}`}
              onClick={() => setFilterMode(mode)}
            >
              {mode === 'ALL' ? '전체' : mode === 'SALE' ? '매매' : mode === 'JEONSE' ? '전세' : '월세'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 가격 필터 토글 */}
      <div className={styles.priceFilterSection}>
        <button
          type="button"
          className={styles.priceFilterToggleButton}
          onClick={() => setShowPriceFilter(prev => !prev)}
        >
          {showPriceFilter ? '▲ 가격 필터 닫기' : '▼ 가격대 설정'}
        </button>
      </div>

      {/* 4. 가격 상세 입력 */}
      {showPriceFilter && (
        <div className={styles.detailedPriceBox}>
           {/* 간소화를 위해 대표적인 필터만 표시 (필요시 확장 가능) */}
           <div className={styles.priceGroup}>
              <span className={styles.priceTargetLabel}>매매/보증금 (만원)</span>
              <div className={styles.priceInputRow}>
                <input name="lumpSumMin" className={styles.filterInput} type="number" placeholder="최소" value={priceFilter.lumpSumMin} onChange={handlePriceChange} />
                <span className={styles.priceRangeSeparator}>~</span>
                <input name="lumpSumMax" className={styles.filterInput} type="number" placeholder="최대" value={priceFilter.lumpSumMax} onChange={handlePriceChange} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PropertyFilter;