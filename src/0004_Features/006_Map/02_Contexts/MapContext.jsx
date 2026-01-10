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

  // ★ [핵심] 모든 선택 및 호버 상태 초기화
  const resetSelection = useCallback(() => {
    setSelectedPin(null);
    setActiveOverlayKey(null);
    setHoveredPinId(null); // 이게 호출되면 useMapMarkers의 useEffect가 돌면서 hideInfoBox()가 실행됨
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