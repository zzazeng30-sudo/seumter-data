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

  /**
   * ★ [수정 및 강화] 매물 선택 또는 등록 모드 진입 시 지도 위치 보정 로직
   * 1. 모바일에서 매물을 클릭했을 때 (selectedPin)
   * 2. 모바일에서 매물 등록 버튼을 눌렀을 때 (isCreating)
   * 위 두 상황에서 하단 패널에 의해 마커가 가려지지 않도록 중심점을 보정합니다.
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    // 보정 대상이 있는지 확인 (선택된 핀이 있거나, 우클릭으로 생성 중인 핀이 있는 경우)
    const target = selectedPin || rightClickPin;
    if (!target) return;

    const lat = target.lat;
    const lng = target.lng;
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // 보정값 설정: 위도(lat)에서 값을 빼면 지도가 아래로 내려가고 핀이 위로 올라옵니다.
      let latOffset = 0.002; // 기본 보정값 (상세 메모용)

      if (isCreating) {
        // 매물 등록 시에는 입력 패널이 더 높게 올라오므로 더 많이 보정합니다.
        latOffset = 0.0045; 
      }

      const moveLatLon = new window.kakao.maps.LatLng(lat - latOffset, lng);
      map.panTo(moveLatLon);
    } else {
      // 데스크탑은 보정 없이 정중앙 이동
      const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
      map.panTo(moveLatLon);
    }
  }, [selectedPin, isCreating, rightClickPin]); // isCreating과 rightClickPin 감지 추가

  const resetSelection = useCallback(() => {
    setSelectedPin(null);
    setActiveOverlayKey(null);
    setHoveredPinId(null);
    setIsCreating(false);
    setIsEditMode(false);
    setIsRightPanelOpen(false);
    setContextMenu(prev => ({ ...prev, visible: false }));
    setRightClickPin(null);
  }, []);

  const handlePinContextMenu = useCallback((e, pin, isStack, nodeId) => {
    if(e.preventDefault) e.preventDefault();
    setSelectedPin(pin);
    setActiveOverlayKey(nodeId);
    if (mapInstanceRef.current) {
      // 지도는 위 useEffect에서 이동하므로 여기서는 panTo를 중복 호출하지 않습니다.
      const container = mapInstanceRef.current.getNode();
      const rect = container.getBoundingClientRect();
      setContextMenu({ visible: true, x: rect.width / 2 + 60, y: rect.height / 2 - 40, pinId: pin.id });
    }
  }, []);

  const onMapRightClick = useCallback(({ latLng }) => {
    // 우클릭 지점으로 이동
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
        // contextMenu에 저장된 좌표로 선택된 핀 설정
        setSelectedPin({ lat: contextMenu.latLng.getLat(), lng: contextMenu.latLng.getLng() });
    } else if (action === 'addStack') {
        if (selectedPin) {
          setIsCreating(true);
          setSelectedPin({ lat: selectedPin.lat, lng: selectedPin.lng, address: selectedPin.address });
        }
    } else if (action === 'editPin') {
        setIsEditMode(true);
    } else if (action === 'deletePin') {
        if(selectedPin?.id) handleDeletePin(selectedPin.id);
        setSelectedPin(null);
    } else if (action === 'roadview') {
        setIsRoadviewMode(true);
    }
  }, [contextMenu, selectedPin, handleDeletePin]);

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
    ...mapVisuals
  }), [
    pins, loading, fetchPins, handleDeletePin, filterState, formState, session, isMapReady, zoomLevel, bounds, displayNodes,
    selectedPin, hoveredPinId, activeOverlayKey, contextMenu, isLeftPanelOpen, isRightPanelOpen, isEditMode, isCreating,
    isRoadviewMode, roadviewPosition, roadviewHeading,
    updateMapState, handleContextMenuAction, handlePinContextMenu, onMapRightClick,
    resetSelection, rightClickPin, mapVisuals
  ]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}