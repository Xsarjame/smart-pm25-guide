import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useRoutePM25, RouteWithPM25 } from '@/hooks/useRoutePM25';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Fix Leaflet default marker icons
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const RouteMapSimple = ({ currentLat, currentLng }: { currentLat: number; currentLng: number }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayers = useRef<L.Polyline[]>([]);
  const pm25Markers = useRef<L.Marker[]>([]);
  const [destination, setDestination] = useState('');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current).setView([currentLat, currentLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add current location marker
    L.marker([currentLat, currentLng], { icon })
      .bindPopup('<strong>ตำแหน่งปัจจุบัน</strong>')
      .addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [currentLat, currentLng]);

  // Update routes on map
  useEffect(() => {
    if (!map.current || routes.length === 0) return;

    // Clear previous layers
    routeLayers.current.forEach(layer => layer.remove());
    routeLayers.current = [];
    pm25Markers.current.forEach(marker => marker.remove());
    pm25Markers.current = [];

    // Add route lines
    routes.forEach((route, index) => {
      const isSelected = index === selectedRouteIndex;
      const coordinates = route.geometry?.coordinates?.map((coord: number[]) => 
        [coord[1], coord[0]] as [number, number]
      ) || [];

      if (coordinates.length === 0) return;

      const color = getRouteColor(route.averagePM25, isSelected);
      const polyline = L.polyline(coordinates, {
        color: color,
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 0.9 : 0.4,
      }).addTo(map.current!);

      polyline.on('click', () => setSelectedRouteIndex(index));
      routeLayers.current.push(polyline);
    });

    // Add PM2.5 markers for selected route
    const selectedRoute = routes[selectedRouteIndex];
    if (selectedRoute?.sampleLocations) {
      selectedRoute.sampleLocations.forEach((location: number[], idx: number) => {
        const pm25 = selectedRoute.pm25Samples[idx];
        const marker = L.marker([location[1], location[0]], {
          icon: createPM25Icon(pm25)
        })
          .bindPopup(`<strong>PM2.5: ${Math.round(pm25)} µg/m³</strong><br/>${getPM25Label(pm25)}`)
          .addTo(map.current!);
        
        pm25Markers.current.push(marker);
      });
    }

    // Fit bounds to selected route
    if (selectedRoute?.geometry?.coordinates) {
      const coordinates = selectedRoute.geometry.coordinates.map((coord: number[]) => 
        [coord[1], coord[0]] as [number, number]
      );
      if (coordinates.length > 0) {
        const bounds = L.latLngBounds(coordinates);
        map.current!.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routes, selectedRouteIndex]);

  const handleSearchDestination = async () => {
    const trimmedDest = destination.trim();
    if (!trimmedDest) {
      alert('กรุณากรอกปลายทาง');
      return;
    }

    if (trimmedDest.length < 2) {
      alert('กรุณากรอกปลายทางอย่างน้อย 2 ตัวอักษร');
      return;
    }
    
    const result = await analyzeRoutes({
      startLat: currentLat,
      startLng: currentLng,
      destination: trimmedDest,
    });

    if (!result) {
      setDestination('');
    }
  };

  const createPM25Icon = (pm25: number) => {
    let bgColor = 'hsl(123, 43%, 42%)'; // good
    if (pm25 > 75) bgColor = 'hsl(282, 44%, 43%)'; // very unhealthy
    else if (pm25 > 50) bgColor = 'hsl(0, 100%, 50%)'; // unhealthy
    else if (pm25 > 35) bgColor = 'hsl(33, 100%, 50%)'; // unhealthy for sensitive
    else if (pm25 > 25) bgColor = 'hsl(48, 100%, 67%)'; // moderate

    return L.divIcon({
      html: `<div style="background-color: ${bgColor}; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${Math.round(pm25)}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const getRouteColor = (avgPM25: number, isSelected: boolean) => {
    if (!isSelected) return 'hsl(var(--muted-foreground))';
    if (avgPM25 > 75) return 'hsl(var(--aqi-very-unhealthy))';
    if (avgPM25 > 50) return 'hsl(var(--aqi-unhealthy))';
    if (avgPM25 > 35) return 'hsl(var(--aqi-unhealthy-sensitive))';
    if (avgPM25 > 25) return 'hsl(var(--aqi-moderate))';
    return 'hsl(var(--aqi-good))';
  };

  const getPM25Variant = (value: number): "default" | "destructive" | "outline" | "secondary" => {
    if (value > 75) return 'destructive';
    if (value > 50) return 'default';
    if (value > 35) return 'secondary';
    return 'outline';
  };

  const getPM25Label = (value: number) => {
    if (value > 75) return 'อันตราย';
    if (value > 50) return 'ไม่ดีต่อสุขภาพ';
    if (value > 35) return 'ปานกลาง';
    if (value > 12) return 'พอใช้';
    return 'ดี';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          เลือกเส้นทางที่ปลอดภัยต่อสุขภาพ
        </CardTitle>
        <CardDescription>
          ค้นหาเส้นทางที่มีระดับ PM2.5 ต่ำที่สุด เพื่อสุขภาพที่ดีของคุณ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="destination">ปลายทาง</Label>
          <div className="flex gap-2">
            <Input
              id="destination"
              placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย, MBK, สยาม"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchDestination()}
              disabled={loading}
            />
            <Button 
              onClick={handleSearchDestination}
              disabled={loading || !destination.trim()}
              className="shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังค้นหา
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  ค้นหา
                </>
              )}
            </Button>
          </div>
        </div>

        <div 
          ref={mapContainer} 
          className="h-[400px] w-full rounded-lg overflow-hidden border border-border"
          style={{ zIndex: 0 }}
        />

        {routes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>ข้อมูล PM2.5 เรียลไทม์จาก Open-Meteo API</span>
            </div>

            <RadioGroup value={selectedRouteIndex.toString()} onValueChange={(v) => setSelectedRouteIndex(parseInt(v))}>
              {routes.map((route, index) => {
                const isRecommended = recommendedRoute?.routeIndex === index;
                return (
                  <div key={index} className="flex items-start space-x-2 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={index.toString()} id={`route-${index}`} className="mt-1" />
                    <Label htmlFor={`route-${index}`} className="flex-1 cursor-pointer">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">เส้นทาง {index + 1}</span>
                          <Badge variant={getPM25Variant(route.averagePM25)}>
                            PM2.5: {route.averagePM25} µg/m³
                          </Badge>
                          <Badge variant="outline">
                            {(route.distance / 1000).toFixed(1)} กม.
                          </Badge>
                          <Badge variant="outline">
                            {Math.round(route.duration / 60)} นาที
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">PM2.5 เฉลี่ย:</span> {route.averagePM25} µg/m³
                          </div>
                          <div>
                            <span className="font-medium">PM2.5 สูงสุด:</span> {route.maxPM25} µg/m³
                          </div>
                        </div>

                        <div className={`text-xs font-medium ${
                          route.averagePM25 > 50 ? 'text-destructive' : 'text-green-600'
                        }`}>
                          {route.healthAlert}
                        </div>

                        {isRecommended && (
                          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            เส้นทางที่ปลอดภัยที่สุดสำหรับสุขภาพ
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• ระบบวิเคราะห์ระดับ PM2.5 จากข้อมูลเรียลไทม์ตลอดเส้นทาง</p>
              <p>• เส้นทางที่แนะนำคือเส้นทางที่มี PM2.5 เฉลี่ยต่ำที่สุด</p>
              <p>• คลิกที่เส้นทางเพื่อดูรายละเอียด PM2.5 ในแต่ละจุด</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
