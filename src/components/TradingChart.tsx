import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries } from 'lightweight-charts';
import { Candle } from '@/lib/binance';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ChartSignal {
  id: string;
  type: 'long' | 'short';
  price: number;
  time: number; // Unix timestamp in seconds
  avatarUrl?: string;
  kolName?: string;
  status?: 'active' | 'closed' | 'cancelled' | 'pending_entry' | 'entered';
  takeProfit?: number | null;
  stopLoss?: number | null;
}

interface TradingChartProps {
  data: Candle[];
  colors?: {
    backgroundColor?: string;
    textColor?: string;
    upColor?: string;
    downColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
  };
  isLoading?: boolean;
  signals?: ChartSignal[];
  hoveredSignalId?: string | null;
}

export const TradingChart = ({ 
  data, 
  colors: {
    backgroundColor = 'transparent',
    textColor = '#DDD',
    upColor = '#26a69a',
    downColor = '#ef5350',
    wickUpColor = '#26a69a',
    wickDownColor = '#ef5350',
  } = {},
  isLoading = false,
  signals = [],
  hoveredSignalId = null,
}: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  // Refs for managing overlay signal elements
  const signalsRef = useRef<ChartSignal[]>(signals);
  const hoveredSignalIdRef = useRef<string | null>(hoveredSignalId);
  const overlayRef = useRef<HTMLDivElement>(null);
  const signalElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const hoverProfitRef = useRef<HTMLDivElement>(null);
  const hoverLossRef = useRef<HTMLDivElement>(null);
  const hoverRatioRef = useRef<HTMLDivElement>(null);

  type SignalMarkerKind = 'entry' | 'takeProfit' | 'stopLoss';
  type SignalMarker = {
    key: string;
    signal: ChartSignal;
    kind: SignalMarkerKind;
    price: number;
  };

  const buildSignalMarkers = (items: ChartSignal[]): SignalMarker[] => {
    return items.flatMap((signal) => {
      const markers: SignalMarker[] = [
        {
          key: `${signal.id}-entry`,
          signal,
          kind: 'entry',
          price: signal.price,
        },
      ];

      const shouldShowTpSl = signal.status === 'entered';
      if (shouldShowTpSl && signal.takeProfit !== null && signal.takeProfit !== undefined) {
        markers.push({
          key: `${signal.id}-tp`,
          signal,
          kind: 'takeProfit',
          price: signal.takeProfit,
        });
      }
      if (shouldShowTpSl && signal.stopLoss !== null && signal.stopLoss !== undefined) {
        markers.push({
          key: `${signal.id}-sl`,
          signal,
          kind: 'stopLoss',
          price: signal.stopLoss,
        });
      }

      return markers;
    });
  };

  // Update refs when props change. 
  // useLayoutEffect ensures the ref is updated before browser paint, 
  // so the RAF loop gets the new data immediately, preventing "flash" of old content.
  useLayoutEffect(() => {
    signalsRef.current = signals;
    
    // Also, trigger an immediate manual update of positions to force cleanup right now
    // This handles the "react unmount" vs "RAF loop" race condition
    if (signalElementsRef.current && overlayRef.current) {
        const markers = buildSignalMarkers(signals);
        const activeKeys = new Set<string>();
        markers.forEach(m => activeKeys.add(m.key));
        
        // Use the same robust cleanup function (redefined here or duplicated logic)
        // Since we can't easily hoist the closure-dependent function cleanly without refactoring big chunks,
        // we'll inline the logic which is safer than breaking effects.
        
        // 1. Map Cleanup
        signalElementsRef.current.forEach((el, key) => {
            if (!activeKeys.has(key)) el.style.display = 'none';
        });

        // 2. DOM Cleanup
        const children = overlayRef.current.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i] as HTMLElement;
            const markerKey = child.getAttribute('data-signal-key');
            if (markerKey && !activeKeys.has(markerKey)) {
                child.style.display = 'none';
            }
        }
    }

  }, [signals]);

  useEffect(() => {
    hoveredSignalIdRef.current = hoveredSignalId;
  }, [hoveredSignalId]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
         chartRef.current?.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        ticksVisible: true,
        visible: true,
          minimumHeight: 32,
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor,
      wickDownColor,
    });
    candleSeriesRef.current = candleSeries;


    window.addEventListener('resize', handleResize);

    // --- Signal Overlay Logic ---
    // We use a RAF loop to sync positions for smoother performance than React state during scroll
    let animationFrameId: number;
    const timeScale = chart.timeScale();

    const cleanupOrphanedMarkers = (activeKeys: Set<string>) => {
        // 1. Cleanup based on Map references (fast path)
        signalElementsRef.current.forEach((el, key) => {
            if (!activeKeys.has(key)) {
                el.style.display = 'none';
            }
        });

        // 2. Cleanup based on DOM traversal (robust path)
        // This handles cases where React ref cleanup ran but actual DOM removal is delayed
        if (overlayRef.current) {
            const children = overlayRef.current.children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i] as HTMLElement;
                const markerKey = child.getAttribute('data-signal-key');
                // Only touch elements that are identified as signal markers
                if (markerKey && !activeKeys.has(markerKey)) {
                    child.style.display = 'none';
                }
            }
        }
    };

    const updateSignalPositions = () => {
      if (!chartRef.current || !candleSeriesRef.current || !overlayRef.current) return;
      
      const series = candleSeriesRef.current;
      // const timeScale = chart.timeScale(); // Already defined in closure

      const markers = buildSignalMarkers(signalsRef.current);

      // Force hide elements that are no longer in the current signals list
      // This ensures immediate visual feedback even if React DOM reconciliation is pending
      const activeKeys = new Set<string>();
      markers.forEach(m => activeKeys.add(m.key));
      
      cleanupOrphanedMarkers(activeKeys);

      markers.forEach(marker => {
        const el = signalElementsRef.current.get(marker.key);
        if (!el) return;

        // Convert time and price to coordinates
        // Note: signal.time must match the data type. Assuming unix seconds (number).
        const x = timeScale.timeToCoordinate(marker.signal.time as Time); 
        const y = series.priceToCoordinate(marker.price);

        if (x === null || y === null) {
          el.style.display = 'none';
        } else {
          el.style.display = 'flex';
          // Centering the marker: Subtract half width/height
          // Assuming marker is 32x32 roughly
          // Anchor container at the exact price Y so the line aligns to the price.
          // We offset X by 16px to center the marker on the candle.
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
      });

      const profitEl = hoverProfitRef.current;
      const lossEl = hoverLossRef.current;
      const ratioEl = hoverRatioRef.current;

      if (!profitEl || !lossEl || !ratioEl) {
        animationFrameId = requestAnimationFrame(updateSignalPositions);
        return;
      }

      const hoveredId = hoveredSignalIdRef.current;
      const hoveredSignal = hoveredId
        ? signalsRef.current.find(s => s.id === hoveredId)
        : undefined;

      if (!hoveredSignal || (hoveredSignal.status !== 'pending_entry' && hoveredSignal.status !== 'entered')) {
        profitEl.style.display = 'none';
        lossEl.style.display = 'none';
        ratioEl.style.display = 'none';
        animationFrameId = requestAnimationFrame(updateSignalPositions);
        return;
      }

      const entryY = series.priceToCoordinate(hoveredSignal.price);
      const tpY = hoveredSignal.takeProfit !== null && hoveredSignal.takeProfit !== undefined
        ? series.priceToCoordinate(hoveredSignal.takeProfit)
        : null;
      const slY = hoveredSignal.stopLoss !== null && hoveredSignal.stopLoss !== undefined
        ? series.priceToCoordinate(hoveredSignal.stopLoss)
        : null;

      if (entryY === null) {
        profitEl.style.display = 'none';
        lossEl.style.display = 'none';
        ratioEl.style.display = 'none';
        animationFrameId = requestAnimationFrame(updateSignalPositions);
        return;
      }

      if (tpY !== null) {
        const top = Math.min(entryY, tpY);
        const height = Math.max(1, Math.abs(entryY - tpY));
        profitEl.style.display = 'block';
        profitEl.style.top = `${top}px`;
        profitEl.style.height = `${height}px`;
      } else {
        profitEl.style.display = 'none';
      }

      if (slY !== null) {
        const top = Math.min(entryY, slY);
        const height = Math.max(1, Math.abs(entryY - slY));
        lossEl.style.display = 'block';
        lossEl.style.top = `${top}px`;
        lossEl.style.height = `${height}px`;
      } else {
        lossEl.style.display = 'none';
      }

      if (tpY !== null && slY !== null) {
        const profitDistance = Math.abs((hoveredSignal.takeProfit as number) - hoveredSignal.price);
        const lossDistance = Math.abs(hoveredSignal.price - (hoveredSignal.stopLoss as number));
        const ratio = lossDistance > 0 ? profitDistance / lossDistance : null;
        if (ratio !== null && Number.isFinite(ratio)) {
          ratioEl.textContent = `盈亏比 ${ratio.toFixed(2)}`;
          ratioEl.style.display = 'flex';
          ratioEl.style.top = `${entryY}px`;
        } else {
          ratioEl.style.display = 'none';
        }
      } else {
        ratioEl.style.display = 'none';
      }
      
      animationFrameId = requestAnimationFrame(updateSignalPositions);
    };

    // Start loop
    animationFrameId = requestAnimationFrame(updateSignalPositions);
    
    // Subscribe to time scale changes (optional, RAF covers it mostly but this can help with edge cases if we stop RAF)
    timeScale.subscribeVisibleTimeRangeChange(() => {
        // We rely on RAF for position updates
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      chart.remove();
    };
  }, [backgroundColor, textColor, upColor, downColor, wickUpColor, wickDownColor]);

  // Update chart size when container resizes (e.g. sidebar toggle)
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ 
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight 
            });
        }
    });
    resizeObserver.observe(chartContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;

    // Prepare data for lightweight-charts
    const chartData = data.map(d => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeriesRef.current.setData(chartData);
    
  }, [data, upColor, downColor]);

  return (
    <div className="relative w-full h-full border border-border rounded-lg bg-card">
       {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 text-foreground">
          Loading Data...
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Signal Overlay Container */}
      <div 
        ref={overlayRef} 
        className="absolute inset-0 pointer-events-none overflow-hidden" 
        style={{ zIndex: 5 }}
      >
        {/* Hover Shadow Zones (TP/SL) */}
        <div
          ref={hoverProfitRef}
          className="absolute left-0 right-0 bg-accent-green/15 pointer-events-none"
          style={{ display: 'none' }}
        />
        <div
          ref={hoverLossRef}
          className="absolute left-0 right-0 bg-accent-red/15 pointer-events-none"
          style={{ display: 'none' }}
        />
        <div
          ref={hoverRatioRef}
          className="absolute right-3 px-2 py-1 rounded bg-background/80 border border-border text-[11px] text-foreground pointer-events-none"
          style={{ display: 'none', transform: 'translateY(-50%)' }}
        />
        {buildSignalMarkers(signals).map((marker) => (
           <div
             key={marker.key}
             data-signal-key={marker.key}
             ref={el => {
                if (el) signalElementsRef.current.set(marker.key, el);
                else signalElementsRef.current.delete(marker.key);
             }}
             className="absolute h-0 w-0 group pointer-events-auto cursor-pointer transition-transform will-change-transform"
             style={{ display: 'none' }} // Hidden initially until positioned
           >
              {marker.kind === 'entry' ? (
                <>
                  {/* Avatar + Name (centered on price line) */}
                  <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                    {/* Name Label */}
                    <div className={`
                      absolute -top-7 whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm z-30
                      ${marker.signal.type === 'long' ? 'bg-green-950/80 text-green-400 border-green-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}
                      ${marker.signal.status === 'closed' ? 'bg-gray-100 text-gray-500 border-gray-200' : ''}
                    `}>
                      {marker.signal.kolName}
                    </div>

                    {/* Avatar Bubble */}
                    <div className={`
                      relative p-0.5 rounded-full border-2 z-20 bg-background
                      ${marker.signal.type === 'long' ? 'border-green-500' : 'border-red-500'}
                      ${marker.signal.status === 'closed' || marker.signal.status === 'cancelled' ? 'opacity-50 grayscale border-gray-400' : ''}
                    `}
                      style={(marker.signal.status === 'entered' || marker.signal.status === 'active') ? {
                        boxShadow: `0 0 8px 3px ${marker.signal.type === 'long' ? 'rgba(51,240,140,0.5)' : 'rgba(240,80,80,0.5)'}`,
                        animation: 'kolGlow 2s ease-in-out infinite',
                      } : undefined}
                    >
                      {/* Pulse Ring 1 */}
                      {(marker.signal.status === 'entered' || marker.signal.status === 'active') && (
                        <span
                          style={{
                            position: 'absolute',
                            inset: '-4px',
                            borderRadius: '9999px',
                            border: `2px solid ${marker.signal.type === 'long' ? 'rgba(51,240,140,0.6)' : 'rgba(240,80,80,0.6)'}`,
                            animation: 'kolPulseRing 2s cubic-bezier(0,0,0.2,1) infinite',
                            pointerEvents: 'none' as const,
                          }}
                        />
                      )}
                      {/* Pulse Ring 2 (delayed) */}
                      {(marker.signal.status === 'entered' || marker.signal.status === 'active') && (
                        <span
                          style={{
                            position: 'absolute',
                            inset: '-4px',
                            borderRadius: '9999px',
                            border: `2px solid ${marker.signal.type === 'long' ? 'rgba(51,240,140,0.4)' : 'rgba(240,80,80,0.4)'}`,
                            animation: 'kolPulseRing 2s cubic-bezier(0,0,0.2,1) infinite 0.6s',
                            pointerEvents: 'none' as const,
                          }}
                        />
                      )}
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={marker.signal.avatarUrl} />
                        <AvatarFallback>{marker.signal.kolName?.substring(0,2)}</AvatarFallback>
                      </Avatar>
                    </div>
                    {/* 已入场 Badge */}
                    {(marker.signal.status === 'entered' || marker.signal.status === 'active') && (
                      <div
                        style={{
                          marginTop: '2px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap' as const,
                          backgroundColor: marker.signal.type === 'long' ? 'rgb(51,240,140)' : 'rgb(240,80,80)',
                          color: marker.signal.type === 'long' ? '#000' : '#fff',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }}
                      >
                        已入场
                      </div>
                    )}
                  </div>

                  {/* Price Line & Label */}
                  <div className={`
                    absolute left-2 top-0 -translate-y-1/2 flex items-center pointer-events-none z-10
                    ${marker.signal.status === 'closed' || marker.signal.status === 'cancelled' ? 'opacity-30 grayscale' : 'opacity-80'}
                  `}>
                       {/* Dashed Line */}
                       <div 
                         className={`h-[1px] border-t-2 border-dashed opacity-0 group-hover:opacity-100 transition-opacity ${marker.signal.type === 'long' ? 'border-green-500' : 'border-red-500'}`}
                          style={{ width: '2000px' }}
                       />
                       
                       {/* Price Pill */}
                       <div className={`
                          absolute left-2 -top-6 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap
                          ${marker.signal.type === 'long' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                       `}>
                          入场价：{marker.price}
                       </div>
                   </div>
                </>
              ) : (
                <>
                  {/* TP/SL Avatar (centered on price line) */}
                  <div
                    className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 p-0.5 rounded-full border z-20 bg-background
                      ${marker.kind === 'takeProfit' ? 'border-accent-green' : 'border-accent-red'}
                    `}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={marker.signal.avatarUrl} />
                      <AvatarFallback className="text-[9px]">{marker.signal.kolName?.substring(0,1)}</AvatarFallback>
                    </Avatar>
                  </div>

                  {/* TP/SL Label (offset to the right, not affecting centering) */}
                  <div className={`
                    absolute left-2 top-0 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap
                    ${marker.kind === 'takeProfit' ? 'bg-accent-green text-black' : 'bg-accent-red text-white'}
                  `}>
                    {marker.kind === 'takeProfit' ? '止盈价' : '止损价'}：{marker.price}
                  </div>

                  {/* TP/SL Line */}
                  <div className={`
                    absolute left-2 top-0 -translate-y-1/2 flex items-center pointer-events-none z-10
                    ${marker.signal.status === 'closed' || marker.signal.status === 'cancelled' ? 'opacity-30 grayscale' : 'opacity-80'}
                  `}>
                       <div 
                         className={`h-[1px] border-t-2 border-dashed opacity-80 ${marker.kind === 'takeProfit' ? 'border-accent-green' : 'border-accent-red'}`}
                          style={{ width: '2000px' }}
                       />
                   </div>
                </>
              )}
           </div>
        ))}
      </div>
    </div>
  );
};

