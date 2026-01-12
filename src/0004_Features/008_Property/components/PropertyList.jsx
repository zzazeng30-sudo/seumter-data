import React, { useState } from 'react';
import styles from '../PropertyPage.module.css';
import { supabase } from '../../../0005_Lib/supabaseClient';

const PropertyList = ({ properties, loading, onEdit, onDelete, onRefresh }) => {
  const [selectedIds, setSelectedIds] = useState([]);

  // 체크박스 로직
  const toggleCheck = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleAllCheck = (e) => {
    if (e.target.checked) {
      setSelectedIds(properties.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.length}개의 매물을 삭제하시겠습니까?`)) return;

    try {
      const { error } = await supabase.from('pins').delete().in('id', selectedIds);
      if (error) throw error;
      alert('삭제되었습니다.');
      setSelectedIds([]);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  if (loading) return <div className={styles.loading}>로딩 중...</div>;

  return (
    <div className={styles.listContainer}>
      {/* 상단 버튼 영역 */}
      <div className={styles.batchDeleteContainer}>
        {selectedIds.length > 0 && (
          <button className={styles.batchDeleteBtn} onClick={handleBatchDelete}>
            선택 삭제 ({selectedIds.length})
          </button>
        )}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            {/* 체크박스 열 */}
            <th>
              <input 
                type="checkbox" 
                onChange={handleAllCheck}
                checked={properties.length > 0 && selectedIds.length === properties.length}
              />
            </th>
            <th>상태</th>
            <th>유형</th>
            <th>건물명/키워드</th>
            <th>주소</th>
            <th>가격 정보</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {properties.length === 0 ? (
            <tr>
              <td colSpan="7" className={styles.noData}>등록된 매물이 없습니다.</td>
            </tr>
          ) : (
            properties.map((property) => (
              <tr key={property.id} className={selectedIds.includes(property.id) ? styles.selectedRow : ''}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(property.id)}
                    onChange={() => toggleCheck(property.id)}
                  />
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[property.status]}`}>
                    {property.status}
                  </span>
                </td>
                <td>{property.property_type}</td>
                <td style={{ fontWeight: '600' }}>{property.building_name || property.keywords || '-'}</td>
                <td style={{ fontSize: '13px', color: '#666' }}>{property.address} {property.detailed_address}</td>
                <td style={{ color: '#2563eb', fontWeight: 'bold' }}>
                  {property.is_sale && `매 ${property.sale_price?.toLocaleString()} `}
                  {property.is_jeonse && `전 ${property.jeonse_deposit?.toLocaleString()} `}
                  {property.is_rent && `월 ${property.rent_deposit?.toLocaleString()}/${property.rent_amount?.toLocaleString()}`}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => onEdit(property)}>수정</button>
                    <button className={styles.deleteBtn} onClick={() => onDelete(property.id)}>삭제</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PropertyList;