/**
 * [Revision Info]
 * Rev: 59.0
 * Date: 2026-01-09
 * Author: AI Assistant (PropTech Expert)
 * [Improvements]
 * 1. 스택 추가(addStack) 액션 로직 구현 (기존 핀 좌표 활용)
 * 2. 리스트-지도 간 양방향 호버를 위한 상태 관리 최적화
 * [Logic Change Log]
 * - Before: addStack 액션 부재로 기능 미동작, 리스트 호버 시 지도 반응 미비
 * - After:  addStack 시 selectedPin 좌표 복사 후 등록 모드 진입, hoveredPinId 동기화 강화
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

  const resetSelection = useCallback(() => {
    setSelectedPin(null);
    setActiveOverlayKey(null);
    setIsCreating(false);
    setIsEditMode(false);
    setIsRightPanelOpen(false);
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handlePinContextMenu = useCallback((e, pin, isStack, nodeId) => {
    if(e.preventDefault) e.preventDefault();
    setSelectedPin(pin);
    setActiveOverlayKey(nodeId);
    if (mapInstanceRef.current) {
      const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);
      mapInstanceRef.current.panTo(position);
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