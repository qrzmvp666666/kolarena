import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Candle } from '@/lib/binance';

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
  isLoading = false
}: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
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
        top: 0.8, // Place volume at the bottom 20%
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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

    // Logic to prevent full redraw on every tick if possible, 
    // but for simplicity and robustness with React state, 
    // we use setData for now. lightweight-charts handles this reasonably well.
    // For specific high-freq optimization, we would compare the last data point.
    
    // We check if the data set is completely different or just an update
    // A simple heuristic: if the array length difference is > 1, it's a history load.
    
    // Note: This is a heavy operation for every tick if the array is huge.
    // Ideally, we would use `series.update()` for the last element.
    // But since `candles` from hook is a new array reference every time...
    
    candleSeriesRef.current.setData(chartData);
    volumeSeriesRef.current.setData(volumeData);

    // Only fit content on initial load or significant change
    // We strictly rely on the hook's loading state to decide "initial"
    // Since we don't track "initial" here easily without more state.
    // But `setData` maintains viewport usually unless we call timeScale().fitContent().
    
  }, [data, upColor, downColor]);

  return (
    <div className="relative w-full h-full border border-gray-800 rounded-lg overflow-hidden bg-card">
       {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 text-white">
          Loading Data...
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};
