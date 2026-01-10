import React, { useState, useEffect } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient';

// CSS Module 임포트
import styles from './MainLayout.module.css';

// 페이지 컴포넌트들
import MapPage from '../../0004_Features/006_Map/01_Pages/MapPage';
import CustomerPage from '../../0004_Features/004_Customer/CustomerPage';
import ContractPage from '../../0004_Features/003_Contract/ContractPage';
import DashboardPage from '../../0004_Features/005_Dashboard/DashboardPage';
import MyPage from '../../0004_Features/007_MyPage/MyPage';
import ConsultationLogPage from '../../0004_Features/002_Consultation/ConsultationLogPage';
import PropertyPage from '../../0004_Features/008_Property/PropertyPage';

const menuData = {
  '대시보드': [
    { id: 'dashboard-schedule', name: '스케줄표', component: <DashboardPage />, icon: '📊' },
    { id: 'dashboard-list', name: '매물 등록', component: <PropertyPage />, isMap: true, icon: '📝' },
  ],
  '매물': [
    { id: 'prop-map', name: '매물 지도', component: <MapPage />, isMap: true, mode: 'manage', icon: '📍' },
    { id: 'prop-list', name: '매물 리스트', component: <PropertyPage />, isMap: true, icon: '📋' },
  ],
  '고객': [
    { id: 'cust-add', name: '고객 추가', icon: '➕' }, 
    { id: 'cust-manage', name: '고객 관리', component: <CustomerPage />, isMap: true, icon: '👥' },
    { id: 'cust-log', name: '상담 관리', component: <ConsultationLogPage />, isMap: true, icon: '💬' },
  ],
  '계약': [
    { id: 'cont-list', name: '계약 리스트', component: <ContractPage />, isMap: true, icon: '🤝' },
  ],
  '마이페이지': [
    { id: 'my-info', name: '내정보 수정', component: <MyPage />, isMyPage: true, icon: '👤' },
  ]
};

const mainMenus = [
  { name: '대시보드', icon: '🏠' },
  { name: '매물', icon: '🏢' },
  { name: '고객', icon: '👥' },
  { name: '계약', icon: '📄' },
  { name: '마이페이지', icon: '⚙️' }
];

export default function MainLayout({ session }) {
  const [activeMainMenu, setActiveMainMenu] = useState('매물');
  const [activeSubMenu, setActiveSubMenu] = useState(menuData['매물'][0].id);
  const [customerModalTrigger, setCustomerModalTrigger] = useState(0);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const currentSubList = menuData[activeMainMenu] || [];
  
  const currentPage = (activeSubMenu === 'cust-add' || activeSubMenu === 'cust-manage')
    ? currentSubList.find(m => m.id === 'cust-manage') 
    : (currentSubList.find(m => m.id === activeSubMenu) || currentSubList[0]);

  const isMapMode = currentPage?.isMap;

  return (
    <div className={styles.layout}>
      {/* 1. 메인 메뉴 바 (데스크탑: 상단 고정 / 모바일: CSS order에 의해 하단 이동) */}
      <header className={`${styles.mainBar} ${styles.noScrollbar}`}>
        {mainMenus.map(m => (
          <button 
            key={m.name} 
            className={`${styles.tab} ${activeMainMenu === m.name ? styles.tabActive : ''}`}
            onClick={() => { 
              setActiveMainMenu(m.name); 
              setActiveSubMenu(menuData[m.name][0].id); 
              setIsCustomerModalVisible(false);
            }}
          >
            {/* 모바일에서만 아이콘 표시 */}
            {isMobile && <span style={{ fontSize: '20px' }}>{m.icon}</span>}
            <span>{m.name}</span>
          </button>
        ))}
      </header>

      {/* 2. 서브 메뉴 바 (데스크탑: 메인 메뉴 아래 / 모바일: 최상단) */}
      <nav className={`${styles.subBar} ${styles.noScrollbar}`}>
        {currentSubList.map(sub => {
          let isTabActive = activeSubMenu === sub.id;
          if (sub.id === 'cust-add') isTabActive = isCustomerModalVisible;
          if (sub.id === 'cust-manage') isTabActive = (activeSubMenu === 'cust-manage' && !isCustomerModalVisible);

          return (
            <button 
              key={sub.id} 
              className={`${styles.subTab} ${isTabActive ? styles.subTabActive : ''}`}
              onClick={() => {
                if(sub.id === 'cust-add') {
                  setActiveSubMenu('cust-manage');
                  setCustomerModalTrigger(prev => prev + 1);
                  setIsCustomerModalVisible(true);
                } else {
                  setActiveSubMenu(sub.id);
                  setIsCustomerModalVisible(false);
                }
              }}
            >
              {/* 모바일 탭 디자인에 아이콘 추가 (선택 사항) */}
              {isMobile && <span style={{ marginRight: '4px' }}>{sub.icon}</span>}
              {sub.name}
            </button>
          );
        })}
      </nav>

      {/* 3. 메인 컨텐츠 영역 */}
      <main className={`${styles.content} ${isMapMode ? styles.contentMapMode : ''}`}>
        {currentPage?.component && React.cloneElement(currentPage.component, { 
          session,
          modalTrigger: customerModalTrigger,
          onModalClose: () => { setIsCustomerModalVisible(false); setCustomerModalTrigger(0); }
        })}
      </main>
    </div>
  );
}