/**
 * [Revision Info]
 * Rev: 1.3
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Logic Change Log]
 * - Before: import { customerService } from '../../../services/customerService'; (경로 오류)
 * - After: import { customerService } from '../../services/customerService'; (경로 수정)
 */
import React, { useState, useEffect, useRef } from 'react';
import styles from './CustomerPage.module.css'; 
import CustomerAddModal from './CustomerAddModal.jsx'; 
// [수정됨] 상위 폴더(004_Customer) -> 상위(0004_Features) -> src 로 가야 하므로 ../../ 입니다.
import { customerService } from '../../services/customerService';

export default function CustomerPage({ session, modalTrigger }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const prevModalTriggerRef = useRef(modalTrigger);

  useEffect(() => {
    if (modalTrigger > 0 && modalTrigger !== prevModalTriggerRef.current) {
      setIsModalOpen(true);
    }
    prevModalTriggerRef.current = modalTrigger;
  }, [modalTrigger]);

  // 1. (Read) 고객 읽어오기 - Service 사용
  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await customerService.getCustomers();
      
    if (error) console.error('고객 로드 오류:', error.message);
    else setCustomers(data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 3. (Delete) 고객 삭제 - Service 사용
  const handleDeleteCustomer = async (customerId) => {
    setLoading(true);
    const { error } = await customerService.deleteCustomer(customerId);
    
    if (error) {
      console.error('고객 삭제 오류:', error.message);
    } else {
      setCustomers(currentCustomers => currentCustomers.filter(c => c.id !== customerId));
    }
    setLoading(false);
  };

  return (
    <main className={styles.pageContainerList}>
      {isModalOpen && (
        <CustomerAddModal 
          session={session} 
          onClose={() => setIsModalOpen(false)} 
          onAddSuccess={() => fetchCustomers()} 
        />
      )}

      <section className={styles.listSectionFull}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>
            내 고객 리스트 (총 {customers.length}명)
          </h2>
          <button 
            className={`${styles.button} ${styles.buttonGreen}`}
            onClick={() => setIsModalOpen(true)}
          >
            + 새 고객 등록
          </button>
        </div>
        
        {loading && <p>고객 목록을 불러오는 중...</p>}
        {!loading && customers.length === 0 && (
          <p className={styles.emptyText}>등록된 고객이 없습니다.</p>
        )}
        
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.col1}>고객명</div>
            <div className={styles.col2}>연락처</div>
            <div className={styles.col3}>유형/구분</div>
            <div className={styles.col5}>키워드</div>
            <div className={styles.col6}>메모</div>
            <div className={styles.col4}>관리</div> 
          </div>
          
          <div className={styles.tableBody}>
            {customers.map(customer => (
              <div key={customer.id} className={styles.tableRow}>
                <div className={styles.col1}>{customer.name}</div>
                <div className={styles.col2}>{customer.phone || '-'}</div>
                <div className={styles.col3}>
                  <span className={styles.customerType}>{customer.customer_type || '미지정'}</span>
                  <span className={styles.customerPurpose}>{customer.purpose || '미지정'}</span>
                </div>
                <div className={styles.col5}>{customer.keywords || '-'}</div>
                <div className={styles.col6}>{customer.notes || '-'}</div>
                <div className={styles.col4}>
                  <button 
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className={styles.deleteButton}
                    disabled={loading}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}