
import React, { createContext, useContext, useMemo, useState } from 'react';

export type TimeZoneOption = {
  value: string;
  label: string;
};

const TIME_ZONES: TimeZoneOption[] = [
  { value: 'Asia/Shanghai', label: 'UTC+8 北京时间' },
  { value: 'UTC', label: 'UTC+0 协调世界时' },
  { value: 'Asia/Tokyo', label: 'UTC+9 东京' },
  { value: 'Europe/London', label: 'UTC+0 伦敦' },
  { value: 'America/New_York', label: 'UTC-5 纽约' },
];

const DEFAULT_TIME_ZONE = 'Asia/Shanghai';
const STORAGE_KEY = 'kolarena_timezone';

interface TimeZoneContextValue {
  timeZone: string;
  timeZones: TimeZoneOption[];
  setTimeZone: (value: string) => void;
}

const TimeZoneContext = createContext<TimeZoneContextValue | undefined>(undefined);

const getInitialTimeZone = () => {
  if (typeof window === 'undefined') return DEFAULT_TIME_ZONE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored || DEFAULT_TIME_ZONE;
};

export const TimeZoneProvider = ({ children }: { children: React.ReactNode }) => {
  const [timeZone, setTimeZoneState] = useState(getInitialTimeZone);

  const setTimeZone = (value: string) => {
    setTimeZoneState(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value);
      window.location.reload();
    }
  };

  const value = useMemo(
    () => ({ timeZone, setTimeZone, timeZones: TIME_ZONES }),
    [timeZone]
  );

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
};

export const useTimeZone = () => {
  const ctx = useContext(TimeZoneContext);
  if (!ctx) throw new Error('useTimeZone must be used within TimeZoneProvider');
  return ctx;
};

export const formatDateTime = (
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
  timeZone: string,
  locale = 'zh-CN'
) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
};
