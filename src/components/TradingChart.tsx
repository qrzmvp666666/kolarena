import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries, MouseEventParams } from 'lightweight-charts';
import { Candle } from '@/lib/binance';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface ChartSignal {
  id: string;
  type: 'long' | 'short';
  price: number;
  time: number; // Unix timestamp in seconds
  avatarUrl?: string;
  kolName?: string;
  status?: 'active' | 'closed' | 'cancelled';
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
  signals = []
}: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  
  // Refs for managing overlay signal elements
  const signalsRef = useRef<ChartSignal[]>(signals);
  const overlayRef = useRef<HTMLDivElement>(null);
  const signalElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Update refs when props change
  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

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

    // Add Volume Series (Histogram) - Overlay at bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay mode
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.76, // Place volume at the bottom with more space for time axis
        bottom: 0.12,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    window.addEventListener('resize', handleResize);

    // --- Signal Overlay Logic ---
    // We use a RAF loop to sync positions for smoother performance than React state during scroll
    let animationFrameId: number;
    const timeScale = chart.timeScale();

    const updateSignalPositions = () => {
      if (!chartRef.current || !candleSeriesRef.current || !overlayRef.current) return;
      
      const series = candleSeriesRef.current;
      // const timeScale = chart.timeScale(); // Already defined in closure

      signalsRef.current.forEach(signal => {
        const el = signalElementsRef.current.get(signal.id);
        if (!el) return;

        // Convert time and price to coordinates
        // Note: signal.time must match the data type. Assuming unix seconds (number).
        const x = timeScale.timeToCoordinate(signal.time as Time); 
        const y = series.priceToCoordinate(signal.price);

        if (x === null || y === null) {
          el.style.display = 'none';
        } else {
          el.style.display = 'flex';
          // Centering the marker: Subtract half width/height
          // Assuming marker is 32x32 roughly
          el.style.transform = `translate(${x - 16}px, ${y - 32}px)`; 
          // y - 32 places it slightly above the candle (if we consider standard pin behavior)
          // or y - 16 to undo center pivot.
        }
      });
      
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
    if (!candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    // Prepare data for lightweight-charts
    const chartData = data.map(d => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = data.map(d => ({
      time: d.time as Time,
      value: d.volume || 0,
      color: d.close >= d.open ? upColor : downColor,
    }));
    
    candleSeriesRef.current.setData(chartData);
    volumeSeriesRef.current.setData(volumeData);
    
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
        {signals.map(signal => (
           <div
             key={signal.id}
             ref={el => {
                if (el) signalElementsRef.current.set(signal.id, el);
                else signalElementsRef.current.delete(signal.id);
             }}
             className="absolute flex flex-col items-center gap-1 group pointer-events-auto cursor-pointer transition-transform will-change-transform"
             style={{ display: 'none' }} // Hidden initially until positioned
           >
              {/* Name Label */}
               <div className={`
                   absolute -top-7 whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm z-30
                    ${signal.type === 'long' ? 'bg-green-950/80 text-green-400 border-green-500/30' : 'bg-red-950/80 text-red-400 border-red-500/30'}
                    ${signal.status === 'closed' ? 'bg-gray-100 text-gray-500 border-gray-200' : ''}
               `}>
                   {signal.kolName}
               </div>

              {/* Avatar Bubble */}
              <div className={`
                 relative p-0.5 rounded-full border-2 z-20 bg-background
                 ${signal.type === 'long' ? 'border-green-500' : 'border-red-500'}
                 ${signal.status === 'closed' || signal.status === 'cancelled' ? 'opacity-50 grayscale border-gray-400' : ''}
              `}>
                <Avatar className="w-8 h-8">
                    <AvatarImage src={signal.avatarUrl} />
                    <AvatarFallback>{signal.kolName?.substring(0,2)}</AvatarFallback>
                </Avatar>
              </div>

              {/* Price Line & Label */}
               <div className={`
                  absolute left-full top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10
                  ${signal.status === 'closed' || signal.status === 'cancelled' ? 'opacity-30 grayscale' : 'opacity-80'}
               `}>
                   {/* Dashed Line */}
                   <div 
                     className={`h-[1px] border-t-2 border-dashed opacity-0 group-hover:opacity-100 transition-opacity ${signal.type === 'long' ? 'border-green-500' : 'border-red-500'}`}
                      style={{ width: '2000px' }}
                   />
                   
                   {/* Price Pill */}
                   <div className={`
                      absolute left-2 -top-6 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap
                      ${signal.type === 'long' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                   `}>
                      入场价：{signal.price}
                   </div>
               </div>
           </div>
        ))}
      </div>
    </div>
  );
};

