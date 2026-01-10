/**
 * [Revision Info]
 * Rev: 1.0
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Improvements]
 * 1. 테이블 렌더링 로직 분리
 * 2. formatPrice 등 복잡한 표시 로직을 컴포넌트 내부 함수로 캡슐화
 */

import React from 'react';
import styles from '../PropertyPage.module.css';

const PropertyList = ({ properties, onDelete, loading }) => {

  // 가격 포맷팅 헬퍼
  const formatPrice = (pin) => {
    const formatNum = (val) => Number(val || 0).toLocaleString();
    const result = { type: [], detail: [] };

    if (pin.is_sale) {
      result.type.push('매매');
      result.detail.push(`<span class="${styles.labelEmphasis}">매매</span> ${formatNum(pin.sale_price)}`);
    }
    if (pin.is_jeonse) {
      result.type.push('전세');
      result.detail.push(`<span class="${styles.labelEmphasis}">전세</span> ${formatNum(pin.jeonse_deposit)}`);
    }
    if (pin.is_rent) {
      result.type.push('월세');
      result.detail.push(`<span class="${styles.labelEmphasis}">월세</span> ${formatNum(pin.rent_deposit)} / ${formatNum(pin.rent_amount)}`);
    }
    return {
      typeStr: result.type.join('\n'),
      detailHtml: result.detail.join('<br/>')
    };
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('ko-KR');

  if (loading) return <p className="p-4">데이터 로딩 중...</p>;
  if (properties.length === 0) return <p className={styles.emptyText}>조건에 맞는 매물이 없습니다.</p>;

  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <div className={styles.col1}>주소/건물명</div>
        <div className={styles.col2}>유형</div>
        <div className={styles.col3}>세구분</div>
        <div className={styles.col4_1}>가격(만원)</div>
        <div className={styles.col6}>메모</div>
        <div className={styles.col7}>등록일</div>
        <div className={styles.col8}>관리</div>
      </div>
      <div>
        {properties.map(pin => {
          const { typeStr, detailHtml } = formatPrice(pin);
          return (
            <div key={pin.id} className={styles.tableRow}>
              <div className={styles.col1}>
                <span className={styles.addressText}>{pin.building_name}</span>
                <span className={styles.memoText}>{pin.address}</span>
                <span className={styles.memoText}>{pin.detailed_address}</span>
              </div>
              <div className={styles.col2}>{pin.property_type}</div>
              <div className={styles.col3} style={{whiteSpace: 'pre-wrap'}}>{typeStr}</div>
              <div className={styles.col4_1} dangerouslySetInnerHTML={{ __html: detailHtml }} />
              <div className={styles.col6}>{pin.notes}</div>
              <div className={styles.col7}>{formatDate(pin.created_at)}</div>
              <div className={styles.col8}>
                <button onClick={() => onDelete(pin.id)} className={styles.deleteButton}>삭제</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyList;