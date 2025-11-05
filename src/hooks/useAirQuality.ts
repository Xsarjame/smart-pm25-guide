import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useToast } from '@/hooks/use-toast';

interface AirQualityData {
  pm25: number;
  location: string;
  timestamp: string;
  temperature: number;
  humidity: number;
}

export const useAirQuality = () => {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const requestNotificationPermission = async () => {
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
  };

  const sendNotification = async (pm25: number, location: string, hasHealthConditions: boolean) => {
    if (pm25 <= 37) return;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    let title = 'แจ้งเตือน: ค่าฝุ่น PM2.5 สูง';
    let body = `พื้นที่ ${location} มีค่า PM2.5 อยู่ที่ ${pm25} µg/m³`;

    if (pm25 > 90) {
      title = '⚠️ เตือนภัย! PM2.5 อยู่ในระดับอันตราย';
    }

    if (hasHealthConditions) {
      body += '\n⚠️ คุณมีโรคประจำตัว โปรดระมัดระวังเป็นพิเศษ';
    }

    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 1000) },
        sound: 'default',
        actionTypeId: '',
        extra: null
      }]
    });
  };

  const fetchAirQuality = async () => {
    setLoading(true);
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const { data: functionData, error } = await supabase.functions.invoke('get-air-quality', {
        body: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      });

      if (error) throw error;

      setData(functionData);

      // Check for health profile and send notification if needed
      const profileStr = localStorage.getItem('healthProfile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        await sendNotification(
          functionData.pm25,
          functionData.location,
          profile.conditions && profile.conditions.length > 0
        );
      }

      toast({
        title: 'อัปเดตข้อมูลสำเร็จ',
        description: `PM2.5: ${functionData.pm25} µg/m³ ที่ ${functionData.location}`,
      });
    } catch (error) {
      console.error('Error fetching air quality:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลคุณภาพอากาศได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAirQuality();
  }, []);

  return {
    data,
    loading,
    refresh: fetchAirQuality
  };
};
