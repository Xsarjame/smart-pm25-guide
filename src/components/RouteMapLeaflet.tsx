import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map bounds and zoom
function MapController({ routes, selectedRouteIndex }: { routes: RouteWithPM25[], selectedRouteIndex: number }) {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0 && routes[selectedRouteIndex]) {
      const route = routes[selectedRouteIndex];
      if (route.geometry?.coordinates) {
        const coordinates = route.geometry.coordinates.map((coord: number[]) => 
          [coord[1], coord[0]] as [number, number]
        );
        if (coordinates.length > 0) {
          const bounds = L.latLngBounds(coordinates);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }
  }, [routes, selectedRouteIndex, map]);

  return null;
}

export const RouteMapLeaflet = ({ currentLat, currentLng }: { currentLat: number; currentLng: number }) => {
  const [destination, setDestination] = useState('');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();

  const handleSearchDestination = async () => {
    if (!destination.trim()) return;
    
    await analyzeRoutes({
      startLat: currentLat,
      startLng: currentLng,
      destination: destination,
    });
  };

  // Create custom icons for PM2.5 markers
  const createPM25Icon = (pm25: number) => {
    const color = pm25 > 75 ? '#ef4444' : pm25 > 50 ? '#f97316' : pm25 > 35 ? '#eab308' : '#22c55e';
    return L.divIcon({
      html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${Math.round(pm25)}</div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Get route color based on PM2.5 level
  const getRouteColor = (avgPM25: number, isSelected: boolean) => {
    if (!isSelected) return '#94a3b8';
    if (avgPM25 > 75) return '#ef4444';
    if (avgPM25 > 50) return '#f97316';
    if (avgPM25 > 35) return '#eab308';
    return '#22c55e';
  };

  const getPM25Variant = (value: number) => {
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

  // Prepare route lines and markers
  const routeLines = useMemo(() => {
    return routes.map((route, index) => {
      const isSelected = index === selectedRouteIndex;
      const coordinates = route.geometry?.coordinates?.map((coord: number[]) => 
        [coord[1], coord[0]] as [number, number]
      ) || [];
      
      return {
        coordinates,
        color: getRouteColor(route.averagePM25, isSelected),
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 0.9 : 0.4,
        route,
        index,
      };
    });
  }, [routes, selectedRouteIndex]);

  const pm25Markers = useMemo(() => {
    if (routes.length === 0) return [];
    const selectedRoute = routes[selectedRouteIndex];
    if (!selectedRoute?.sampleLocations) return [];

    return selectedRoute.sampleLocations.map((location: number[], idx: number) => ({
      position: [location[1], location[0]] as [number, number],
      pm25: selectedRoute.pm25Samples[idx],
    }));
  }, [routes, selectedRouteIndex]);

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

        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border">
          <MapContainer
            center={[currentLat, currentLng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Current location marker */}
            <Marker position={[currentLat, currentLng]}>
              <Popup>
                <div className="text-sm font-medium">ตำแหน่งปัจจุบัน</div>
              </Popup>
            </Marker>

            {/* Route lines */}
            {routeLines.map((line, index) => (
              line.coordinates.length > 0 && (
                <Polyline
                  key={`route-${index}`}
                  positions={line.coordinates}
                  color={line.color}
                  weight={line.weight}
                  opacity={line.opacity}
                  eventHandlers={{
                    click: () => setSelectedRouteIndex(index),
                  }}
                />
              )
            ))}

            {/* PM2.5 markers */}
            {pm25Markers.map((marker, idx) => (
              <Marker
                key={`pm25-${idx}`}
                position={marker.position}
                icon={createPM25Icon(marker.pm25)}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold">PM2.5: {Math.round(marker.pm25)} µg/m³</div>
                    <div className="text-muted-foreground">{getPM25Label(marker.pm25)}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            <MapController routes={routes} selectedRouteIndex={selectedRouteIndex} />
          </MapContainer>
        </div>

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
