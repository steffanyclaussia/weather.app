import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, MapPin, LocateFixed, 
  Moon, CloudSun, CloudMoon, CloudFog, CloudDrizzle, CloudSnow, CloudLightning, Calendar, Clock,
  ArrowLeft, ChevronRight
} from 'lucide-react';

interface WeatherAppProps {
  onUnlock: () => void;
}

const getWeatherInfo = (code: number, isDay: boolean = true) => {
  if (code === 0) return { icon: isDay ? Sun : Moon, text: 'Cerah' };
  if (code === 1 || code === 2) return { icon: isDay ? CloudSun : CloudMoon, text: 'Berawan Sebagian' };
  if (code === 3) return { icon: Cloud, text: 'Mendung' };
  if (code === 45 || code === 48) return { icon: CloudFog, text: 'Berkabut' };
  if (code >= 51 && code <= 57) return { icon: CloudDrizzle, text: 'Gerimis' };
  if (code >= 61 && code <= 67) return { icon: CloudRain, text: 'Hujan' };
  if (code >= 71 && code <= 77) return { icon: CloudSnow, text: 'Salju' };
  if (code >= 80 && code <= 82) return { icon: CloudRain, text: 'Hujan Lebat' };
  if (code >= 95) return { icon: CloudLightning, text: 'Badai Petir' };
  return { icon: Cloud, text: 'Tidak Diketahui' };
};

export const WeatherApp: React.FC<WeatherAppProps> = ({ onUnlock }) => {
  const [tapCount, setTapCount] = useState(0);
  const [weather, setWeather] = useState<any>(null);
  const [hourly, setHourly] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [locationName, setLocationName] = useState<string>('Mencari lokasi...');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [view, setView] = useState<'main' | 'forecast'>('main');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchCurrentLocation = useCallback(() => {
    setLoading(true);
    setLocationName('Mendeteksi lokasi realtime...');

    const fetchWeatherData = async (lat: number, lon: number, isDefault: boolean = false) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,wind_speed_10m,weathercode&hourly=temperature_2m,weathercode,is_day&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        
        setWeather(data.current);

        const currentHour = new Date().getHours();
        const hourlyData = [];
        const startIndex = data.hourly.time.findIndex((t: string) => new Date(t).getHours() === currentHour && new Date(t).getDate() === new Date().getDate());
        const safeStartIndex = startIndex !== -1 ? startIndex : 0;
        
        for (let i = safeStartIndex; i < safeStartIndex + 24; i++) {
          if (data.hourly.time[i]) {
            hourlyData.push({
              time: new Date(data.hourly.time[i]),
              temp: data.hourly.temperature_2m[i],
              code: data.hourly.weathercode[i],
              isDay: data.hourly.is_day[i] === 1
            });
          }
        }
        setHourly(hourlyData);

        const dailyData = [];
        for (let i = 0; i < data.daily.time.length; i++) {
          dailyData.push({
            date: new Date(data.daily.time[i]),
            maxTemp: data.daily.temperature_2m_max[i],
            minTemp: data.daily.temperature_2m_min[i],
            code: data.daily.weathercode[i]
          });
        }
        setDaily(dailyData);

        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
        const geoData = await geoRes.json();
        
        let locName = geoData.city || geoData.locality || geoData.principalSubdivision || 'Lokasi Tidak Diketahui';
        if (isDefault) {
          locName = 'Surabaya (Default)';
        }
        setLocationName(locName);
      } catch (error) {
        console.error("Gagal mengambil data cuaca atau lokasi", error);
        setLocationName('Lokasi Tidak Diketahui');
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("Akses lokasi ditolak atau gagal, menggunakan default (Surabaya)", error);
          fetchWeatherData(-7.2504, 112.7688, true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
      );
    } else {
      fetchWeatherData(-7.2504, 112.7688, true);
    }
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  const handleIconClick = () => {
    setTapCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        onUnlock();
        return 0;
      }
      return newCount;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
        <p className="text-white/80 font-medium animate-pulse">Mendeteksi lokasi realtime Anda...</p>
      </div>
    );
  }

  const currentInfo = weather ? getWeatherInfo(weather.weathercode, weather.is_day === 1) : getWeatherInfo(0);
  const CurrentIcon = currentInfo.icon;

  return (
    <div className="h-screen bg-gradient-to-br from-blue-400 to-blue-800 overflow-y-auto custom-scrollbar font-sans text-white">
      <div className="max-w-md mx-auto p-4 pb-10 min-h-full flex flex-col">
        
        {view === 'main' ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6 pt-4">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <MapPin size={20} className="text-white/80 flex-shrink-0" />
                  <h2 className="text-xl font-bold tracking-wide truncate">{locationName}</h2>
                </div>
                <div className="flex items-center space-x-1.5 mt-1 text-white/70 text-sm ml-1">
                  <Clock size={14} />
                  <span>
                    {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="mx-1">•</span>
                  <span>
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
              <button 
                onClick={fetchCurrentLocation}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                title="Perbarui Lokasi Realtime"
              >
                <LocateFixed size={18} className="text-white" />
              </button>
            </div>

            <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 shadow-lg border border-white/30 flex flex-col items-center justify-center mb-6">
              <div 
                onClick={handleIconClick}
                className="cursor-pointer transition-transform active:scale-95 p-4 rounded-full bg-white/10 hover:bg-white/20 mb-4"
                title="Weather Icon"
              >
                <CurrentIcon size={80} className={weather?.is_day ? "text-yellow-300" : "text-blue-200"} />
              </div>
              
              <div className="text-7xl font-bold tracking-tighter mb-2 ml-4">
                {weather?.temperature_2m ? Math.round(weather.temperature_2m) : '--'}°
              </div>
              <p className="text-xl font-medium text-white/90 capitalize mb-6">
                {currentInfo.text}
              </p>

              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-white/10 rounded-2xl p-3 flex items-center space-x-3">
                  <Wind className="text-blue-200" size={20} />
                  <div>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">Angin</p>
                    <p className="text-sm font-semibold">{weather?.wind_speed_10m || '--'} km/h</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 flex items-center space-x-3">
                  <Droplets className="text-blue-200" size={20} />
                  <div>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">Kelembaban</p>
                    <p className="text-sm font-semibold">{weather?.relative_humidity_2m || '--'}%</p>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setView('forecast')}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center justify-between transition-all active:scale-[0.98]"
            >
              <div className="flex items-center space-x-3">
                <Calendar className="text-blue-200" size={24} />
                <span className="font-semibold text-lg">Lihat Ramalan Lengkap</span>
              </div>
              <ChevronRight size={24} className="text-white/70" />
            </button>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col h-full">
            <div className="flex items-center mb-6 pt-4">
              <button 
                onClick={() => setView('main')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors mr-4"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              <h2 className="text-xl font-bold tracking-wide">Ramalan Cuaca</h2>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center uppercase tracking-wider">
                <Clock size={16} className="mr-2" /> 24 Jam Kedepan
              </h3>
              <div className="flex overflow-x-auto pb-4 space-x-3 custom-scrollbar">
                {hourly.map((hour, index) => {
                  const HourIcon = getWeatherInfo(hour.code, hour.isDay).icon;
                  const isNow = index === 0;
                  return (
                    <div 
                      key={index} 
                      className={`flex flex-col items-center justify-center min-w-[75px] p-4 rounded-2xl border ${isNow ? 'bg-white/30 border-white/50 shadow-lg' : 'bg-white/10 border-white/10'} backdrop-blur-md flex-shrink-0`}
                    >
                      <span className="text-xs font-medium mb-3 text-white/90">
                        {isNow ? 'Sekarang' : hour.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <HourIcon size={28} className={`mb-3 ${hour.isDay ? 'text-yellow-300' : 'text-blue-200'}`} />
                      <span className="text-base font-bold">{Math.round(hour.temp)}°</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center uppercase tracking-wider">
                <Calendar size={16} className="mr-2" /> 7 Hari Kedepan
              </h3>
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-5 border border-white/20 shadow-lg">
                {daily.map((day, index) => {
                  const DayIcon = getWeatherInfo(day.code, true).icon;
                  const isToday = index === 0;
                  const dayName = isToday ? 'Hari Ini' : day.date.toLocaleDateString('id-ID', { weekday: 'long' });
                  
                  return (
                    <div key={index} className="flex items-center justify-between py-4 border-b border-white/10 last:border-0 last:pb-0 first:pt-0">
                      <span className="w-28 text-base font-medium text-white/90 capitalize">{dayName}</span>
                      <div className="flex items-center justify-center flex-1">
                        <DayIcon size={24} className="text-white/80" />
                      </div>
                      <div className="w-24 flex justify-end space-x-4 text-base">
                        <span className="font-bold">{Math.round(day.maxTemp)}°</span>
                        <span className="text-white/50">{Math.round(day.minTemp)}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};