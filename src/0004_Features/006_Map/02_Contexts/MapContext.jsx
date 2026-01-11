/**
 * [Revision: 56.0]
 * - 스택 매물 등록 모드 지원 추가 (isStackMode, stackParentPin)
 * - startStackRegistration, closeStackMode 함수 추가
 */
import React, { createContext, useContext, useState, useRef, useMemo, useCallback, useEffect } from 'react';
import usePinForm from '../04_Hooks/usePinForm';
import useMapFilters from '../04_Hooks/useMapFilters';
import useMapData from '../04_Hooks/useMapData';       
import useClustering from '../04_Hooks/useClustering'; 
import useMapMarkers from '../04_Hooks/useMapMarkers'; 

const MapContext = createContext(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error("❌ MapContext Error");
  return context;
}

export function MapProvider({ children, session }) {
  const { pins, loading, fetchPins, handleDeletePin } = useMapData(session);
  const formState = usePinForm();
  const filterState = useMapFilters(pins);

  const [isMapReady, setIsMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(3);
  const [bounds, setBounds] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const displayNodes = useClustering(filterState.filteredPins, zoomLevel, bounds);

  const [selectedPin, setSelectedPin] = useState(null); 
  const [activeOverlayKey, setActiveOverlayKey] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, latLng: null });
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false); 
  const [isEditMode, setIsEditMode] = useState(false); 
  const [isCreating, setIsCreating] = useState(false);
  const [rightClickPin, setRightClickPin] = useState(null);

  // ★ [추가] 스택 등록 모드 관련 상태
  const [isStackMode, setIsStackMode] = useState(false);
  const [stackParentPin, setStackParentPin] = useState(null);

  const [isRoadviewMode, setIsRoadviewMode] = useState(false);
  const [roadviewPosition, setRoadviewPosition] = useState(null);
  const [roadviewHeading, setRoadviewHeading] = useState(0);

  useEffect(() => {
    if (session?.user?.id) fetchPins();
  }, [session?.user?.id, fetchPins]); 

  const updateMapState = useCallback(() => {
    if (mapInstanceRef.current) {
      setZoomLevel(mapInstanceRef.current.getLevel());
      setBounds(mapInstanceRef.current.getBounds());
    }
  }, []);

  // ★ [추가] 스택 등록 시작 함수
  const startStackRegistration = useCallback((parentPin) => {
    setStackParentPin(parentPin);
    setIsStackMode(true);
    // 기존 선택 해제 (오른쪽 패널 전환을 위해)
    setSelectedPin(null);
    setIsCreating(false);
    setIsEditMode(false);
    setIsRightPanelOpen(true); // 패널 열기
  }, []);

  // ★ [추가] 스택 등록 종료 함수
  const closeStackMode = useCallback(() => {
    setIsStackMode(false);
    setStackParentPin(null);
    setIsRightPanelOpen(false); // 패널 닫기 (필요시)
  }, []);

  /**
   * ★ [수정 및 강화] 매물 선택 또는 등록 모드 진입 시 지도 위치 보정 로직
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    // 보정 대상이 있는지 확인 (선택된 핀, 우클릭 생성 중, 혹은 스택 등록 중)
    const target = selectedPin || rightClickPin || (isStackMode ? stackParentPin : null);
    if (!target) return;

    const lat = parseFloat(target.lat);
    const lng = parseFloat(target.lng);
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // 보정값 설정
      let latOffset = 0.002; 

      if (isCreating || isStackMode) {
        // 등록 모드일 때는 패널이 더 높게 올라오므로 더 많이 보정
        latOffset = 0.0045; 
      }

      const moveLatLon = new window.kakao.maps.LatLng(lat - latOffset, lng);
      map.panTo(moveLatLon);
    } else {
      // 데스크탑은 보정 없이 정중앙 이동
      const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
      map.panTo(moveLatLon);
    }
  }, [selectedPin, isCreating, rightClickPin, isStackMode, stackParentPin]);

  const resetSelection = useCallback(() => {
    setSelectedPin(null);
    setActiveOverlayKey(null);
    setHoveredPinId(null);
    setIsCreating(false);
    setIsEditMode(false);
    setIsRightPanelOpen(false);
    setContextMenu(prev => ({ ...prev, visible: false }));
    setRightClickPin(null);
    // 스택 모드도 초기화
    setIsStackMode(false);
    setStackParentPin(null);
  }, []);

  const handlePinContextMenu = useCallback((e, pin, isStack, nodeId) => {
    if(e.preventDefault) e.preventDefault();
    setSelectedPin(pin);
    setActiveOverlayKey(nodeId);
    if (mapInstanceRef.current) {
      const container = mapInstanceRef.current.getNode();
      const rect = container.getBoundingClientRect();
      setContextMenu({ visible: true, x: rect.width / 2 + 60, y: rect.height / 2 - 40, pinId: pin.id });
    }
  }, []);

  const onMapRightClick = useCallback(({ latLng }) => {
    if (mapInstanceRef.current) mapInstanceRef.current.panTo(latLng);
    
    setRightClickPin({ lat: latLng.getLat(), lng: latLng.getLng() });
    const container = mapInstanceRef.current.getNode();
    const rect = container.getBoundingClientRect();
    setContextMenu({ visible: true, latLng, x: rect.width / 2 + 60, y: rect.height / 2 - 40, pinId: null });
  }, []);

  const handleContextMenuAction = useCallback((action) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    if (action === 'createPin') {
        setIsCreating(true);
        setSelectedPin({ lat: contextMenu.latLng.getLat(), lng: contextMenu.latLng.getLng() });
    } else if (action === 'addStack') {
        if (selectedPin) {
          // ★ 컨텍스트 메뉴에서 바로 스택 추가 시에도 사용 가능하도록 연결
          startStackRegistration(selectedPin);
        }
    } else if (action === 'editPin') {
        setIsEditMode(true);
    } else if (action === 'deletePin') {
        if(selectedPin?.id) handleDeletePin(selectedPin.id);
        setSelectedPin(null);
    } else if (action === 'roadview') {
        setIsRoadviewMode(true);
    }
  }, [contextMenu, selectedPin, handleDeletePin, startStackRegistration]);

  const mapVisuals = useMapMarkers({
    mapInstanceRef, isMapReady, displayNodes,
    setSelectedPin, setActiveOverlayKey, handlePinContextMenu,
    selectedPin, hoveredPinId, setHoveredPinId, activeOverlayKey
  });

  const value = useMemo(() => ({
    pins, loading, fetchPins, handleDeletePin, ...filterState, ...formState, session,
    isMapReady, setIsMapReady, zoomLevel, bounds, displayNodes,
    mapRef, mapInstanceRef, updateMapState,
    selectedPin, setSelectedPin, hoveredPinId, setHoveredPinId,
    activeOverlayKey, setActiveOverlayKey, contextMenu, handleContextMenuAction,
    isLeftPanelOpen, setIsLeftPanelOpen, isRightPanelOpen, setIsRightPanelOpen,
    isEditMode, setIsEditMode, isCreating, setIsCreating,
    isRoadviewMode, setIsRoadviewMode, roadviewPosition, setRoadviewPosition,
    roadviewHeading, setRoadviewHeading,
    handlePinContextMenu, onMapRightClick, resetSelection, rightClickPin,
    
    // ★ 스택 관련 상태 내보내기
    isStackMode, stackParentPin, startStackRegistration, closeStackMode,

    ...mapVisuals
  }), [
    pins, loading, fetchPins, handleDeletePin, filterState, formState, session, isMapReady, zoomLevel, bounds, displayNodes,
    selectedPin, hoveredPinId, activeOverlayKey, contextMenu, isLeftPanelOpen, isRightPanelOpen, isEditMode, isCreating,
    isRoadviewMode, roadviewPosition, roadviewHeading,
    updateMapState, handleContextMenuAction, handlePinContextMenu, onMapRightClick,
    resetSelection, rightClickPin, mapVisuals,
    // 스택 의존성 추가
    isStackMode, stackParentPin, startStackRegistration, closeStackMode
  ]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}