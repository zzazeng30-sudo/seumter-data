import React, { useState } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient';

// 페이지 컴포넌트들
import MapPage from '../../0004_Features/006_Map/01_Pages/MapPage';
import CustomerPage from '../../0004_Features/004_Customer/CustomerPage';
import ContractPage from '../../0004_Features/003_Contract/ContractPage';
import DashboardPage from '../../0004_Features/005_Dashboard/DashboardPage';
import MyPage from '../../0004_Features/007_MyPage/MyPage';
import ConsultationLogPage from '../../0004_Features/002_Consultation/ConsultationLogPage';
import PropertyPage from '../../0004_Features/008_Property/PropertyPage';

import styles from './MainLayout.module.css';

// 메뉴 데이터 (isMap: true 옵션이 중요합니다)
const menuData = {
  '대시보드': [
    { id: 'dashboard-schedule', name: '스케줄표', component: <DashboardPage /> },
    { id: 'dashboard-new', name: '신규 현황', component: <DashboardPage /> }, 
    { id: 'dashboard-list', name: '매물 등록', component: <PropertyPage />, isMap: true }, 
    { id: 'dashboard-stats', name: '경영통계', component: <DashboardPage /> }, 
  ],
  '매물': [
    { id: 'prop-map', name: '매물 지도', component: <MapPage />, isMap: true, mode: 'manage' },
    { id: 'prop-list', name: '매물 리스트', component: <PropertyPage />, isMap: true },
  ],
  '고객': [
    { id: 'cust-upload', name: '고객 추가' },
    { id: 'cust-manage', name: '고객 관리', component: <CustomerPage />, isMap: true },
    { id: 'cust-log', name: '상담 관리', component: <ConsultationLogPage />, isMap: true }, 
  ],
  '계약': [
    { id: 'cont-list', name: '계약 리스트', component: <ContractPage />, isMap: true }, 
    { id: 'cont-upload', name: '계약서 작성' },
  ],
  '마이페이지': [
    { id: 'my-info', name: '내정보 수정', component: <MyPage />, isMyPage: true },
    { id: 'my-staff', name: '직원 관리', component: <MyPage />, isMyPage: true },
    { id: 'my-payment', name: '결제 관리' },
  ],
  '고객센터': [
    { id: 'sup-notice', name: '공지사항' },
    { id: 'sup-qna', name: '1:1 문의하기' },
  ],
  '사용방법': [
    { id: 'guide-main', name: '사용방법' },
  ]
};

const mainMenus = ['대시보드', '매물', '고객', '계약', '마이페이지', '고객센터', '사용방법'];

export default function MainLayout({ session }) {
  const [activeMainMenu, setActiveMainMenu] = useState(mainMenus[1]); 
  const [activeSubMenu, setActiveSubMenu] = useState(menuData[mainMenus[1]][0].id);
  const [customerModalTrigger, setCustomerModalTrigger] = useState(0);

  // ★ 현재 활성화된 페이지 정보 찾기 (여기가 중요)
  const currentSubMenuList = menuData[activeMainMenu];
  const currentPage = currentSubMenuList.find(menu => menu.id === activeSubMenu);
  // 현재 페이지가 지도(Map) 속성을 가지고 있는지 확인
  const isMapMode = currentPage?.isMap; 

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('로그아웃 오류:', error);
  };

  const handleMainMenuClick = (menuName) => {
    setActiveMainMenu(menuName);
    if (menuName === '고객') {
      setActiveSubMenu('cust-manage'); 
    } else {
      setActiveSubMenu(menuData[menuName][0].id);
    }
  };

  const handleSubMenuClick = (menuId) => {
    if (menuId === 'cust-upload') {
      setActiveSubMenu('cust-manage'); 
      setCustomerModalTrigger(prev => prev + 1); 
    } else {
      setActiveSubMenu(menuId); 
    }
  };

  const renderPageContent = () => {
    if (currentPage && currentPage.component) {
      let propsToPass = { session };

      if (currentPage.isMyPage) {
          const tabId = currentPage.id === 'my-info' ? 'info' : 
                        currentPage.id === 'my-staff' ? 'staff' : 'info';
          propsToPass.initialTab = tabId;
      } 
      
      if (currentPage.mode) {
          propsToPass.mode = currentPage.mode;
      }
      
      if (currentPage.id === 'cust-manage') {
          propsToPass.modalTrigger = customerModalTrigger;
      }

      // 컴포넌트 복제 및 props 전달
      return React.cloneElement(currentPage.component, propsToPass);
    }

    return (
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>{currentPage ? currentPage.name : '준비중'}</h1>
        <p>준비 중인 페이지입니다.</p>
      </div>
    );
  };

  return (
    <div className={styles.layoutContainer}>
      
      <header className={styles.mainMenuBar}>
        <nav className={styles.mainMenuTabs}>
          {mainMenus.map(menuName => (
            <button
              key={menuName}
              className={`${styles.mainMenuTab} ${activeMainMenu === menuName ? styles.active : ''}`}
              onClick={() => handleMainMenuClick(menuName)}
            >
              {menuName}
            </button>
          ))}
        </nav>
        
        <div className={styles.mainMenuUserInfo}>
          <span className={styles.mainMenuUserEmail}>{session.user.email} 님</span>
          <button className={styles.logoutButton} onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <nav className={styles.subMenuBar}>
        {menuData[activeMainMenu].map(menuItem => (
          <button
            key={menuItem.id}
            className={`${styles.subMenuTab} ${activeSubMenu === menuItem.id ? styles.active : ''}`}
            onClick={() => handleSubMenuClick(menuItem.id)}
          >
            {menuItem.name}
          </button>
        ))}
      </nav>

      {/* ★ 핵심 수정: 지도가 있는 페이지면 'fullContentArea' 스타일 적용 (여백 제거) */}
      <main className={isMapMode ? styles.fullContentArea : styles.contentArea}>
        {renderPageContent()}
      </main>

      {/* 지도 모드일 때는 푸터를 숨기거나, 필요하면 보여줄 수 있음 (여기선 유지) */}
      {!isMapMode && (
        <footer className={styles.footer}>
          <p>&copy; {new Date().getFullYear()} 사장님 CRM. All rights reserved.</p>
        </footer>
      )}

    </div>
  );
}