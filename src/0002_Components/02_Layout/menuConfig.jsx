/**
 * [Revision Info]
 * Rev: 1.16 (JSX Syntax Fix)
 * Date: 2026-01-10
 */
import React from 'react'; // 이 줄이 반드시 있어야 합니다.

// 페이지 컴포넌트 임포트
import MapPage from '../../0004_Features/006_Map/01_Pages/MapPage';
import CustomerPage from '../../0004_Features/004_Customer/CustomerPage';
import ContractPage from '../../0004_Features/003_Contract/ContractPage';
import DashboardPage from '../../0004_Features/005_Dashboard/DashboardPage';
import MyPage from '../../0004_Features/007_MyPage/MyPage';
import ConsultationLogPage from '../../0004_Features/002_Consultation/ConsultationLogPage';
import PropertyPage from '../../0004_Features/008_Property/PropertyPage';

export const mainMenus = ['대시보드', '매물', '고객', '계약', '마이페이지'];

export const menuData = {
  '대시보드': [
    { id: 'dash-main', name: '현황판', component: <DashboardPage /> },
    { id: 'dash-reg', name: '매물등록', component: <PropertyPage />, isMap: true }
  ],
  '매물': [
    { id: 'prop-map', name: '매물지도', component: <MapPage />, isMap: true, mode: 'manage' },
    { id: 'prop-list', name: '매물리스트', component: <PropertyPage />, isMap: true }
  ],
  '고객': [
    { id: 'cust-manage', name: '고객관리', component: <CustomerPage />, isMap: true },
    { id: 'cust-log', name: '상담관리', component: <ConsultationLogPage />, isMap: true }
  ],
  '계약': [
    { id: 'cont-list', name: '계약리스트', component: <ContractPage />, isMap: true }
  ],
  '마이페이지': [
    { id: 'my-info', name: '내정보', component: <MyPage />, isMyPage: true }
  ]
};