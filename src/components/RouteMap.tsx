import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useRoutePM25, RouteWithPM25 } from '@/hooks/useRoutePM25';
import { Badge } from '@/components/ui/badge';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || 'YOUR_MAPBOX_TOKEN';

export const RouteMap = ({ currentLat, currentLng }: { currentLat: number; currentLng: number }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const { routes, recommendedRoute, loading, analyzeRoutes } = useRoutePM25();

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [currentLng, currentLat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add current location marker
    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([currentLng, currentLat])
      .setPopup(new mapboxgl.Popup().setHTML('<p>ตำแหน่งปัจจุบัน</p>'))
      .addTo(map.current);

    return () => {
      map.current?.remove();
    };
  }, [currentLat, currentLng]);

  useEffect(() => {
    if (!map.current || routes.length === 0) return;

    // Clear existing route layers
    if (map.current.getLayer('route-recommended')) {
      map.current.removeLayer('route-recommended');
      map.current.removeSource('route-recommended');
    }
    if (map.current.getLayer('route-alternative')) {
      map.current.removeLayer('route-alternative');
      map.current.removeSource('route-alternative');
    }

    // Add recommended route (green/yellow/red based on PM2.5)
    if (recommendedRoute) {
      const color = recommendedRoute.averagePM25 > 50 ? '#ef4444' : 
                    recommendedRoute.averagePM25 > 37 ? '#f59e0b' : '#10b981';
      
      map.current.addSource('route-recommended', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: recommendedRoute.geometry,
        },
      });

      map.current.addLayer({
        id: 'route-recommended',
        type: 'line',
        source: 'route-recommended',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': color,
          'line-width': 5,
        },
      });

      // Add destination marker
      const destCoords = recommendedRoute.geometry.coordinates[
        recommendedRoute.geometry.coordinates.length - 1
      ];
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(destCoords)
        .setPopup(new mapboxgl.Popup().setHTML('<p>จุดหมาย</p>'))
        .addTo(map.current);

      // Fit bounds to show entire route
      const bounds = new mapboxgl.LngLatBounds();
      recommendedRoute.geometry.coordinates.forEach((coord: number[]) => {
        bounds.extend(coord as [number, number]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Add alternative routes (lighter color)
    routes.slice(1).forEach((route, index) => {
      map.current!.addSource(`route-alt-${index}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        },
      });

      map.current!.addLayer({
        id: `route-alt-${index}`,
        type: 'line',
        source: `route-alt-${index}`,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#94a3b8',
          'line-width': 3,
          'line-opacity': 0.5,
        },
      });
    });
  }, [routes, recommendedRoute]);

  const handleSearchDestination = async () => {
    if (!destination) return;

    // Geocode destination using Mapbox
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${MAPBOX_TOKEN}&country=th&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setDestLat(lat);
        setDestLng(lng);
        
        // Analyze routes
        await analyzeRoutes({
          startLat: currentLat,
          startLng: currentLng,
          endLat: lat,
          endLng: lng,
        });
      }
    } catch (error) {
      console.error('Error geocoding:', error);
    }
  };

  const getPM25Variant = (pm25: number): "default" | "destructive" | "outline" | "secondary" => {
    if (pm25 > 50) return 'destructive';
    if (pm25 > 37) return 'secondary';
    return 'default';
  };

  const getPM25Label = (pm25: number) => {
    if (pm25 > 50) return 'สูง';
    if (pm25 > 37) return 'ปานกลาง';
    return 'ดี';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          <CardTitle>นำทางหลีกเลี่ยง PM2.5</CardTitle>
        </div>
        <CardDescription>
          ค้นหาเส้นทางที่มีค่า PM2.5 ต่ำที่สุด
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="destination">ค้นหาจุดหมายปลายทาง</Label>
          <div className="flex gap-2">
            <Input
              id="destination"
              placeholder="ใส่ชื่อสถานที่หรือที่อยู่"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchDestination()}
            />
            <Button onClick={handleSearchDestination} disabled={loading || !destination}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div ref={mapContainer} className="h-[400px] rounded-lg" />

        {recommendedRoute && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">เส้นทางแนะนำ (PM2.5 ต่ำสุด)</span>
                <Badge variant={getPM25Variant(recommendedRoute.averagePM25)}>
                  {getPM25Label(recommendedRoute.averagePM25)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ระยะทาง:</span>{' '}
                  <span className="font-medium">{(recommendedRoute.distance / 1000).toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-muted-foreground">เวลา:</span>{' '}
                  <span className="font-medium">{Math.round(recommendedRoute.duration / 60)} นาที</span>
                </div>
                <div>
                  <span className="text-muted-foreground">PM2.5 เฉลี่ย:</span>{' '}
                  <span className="font-medium">{recommendedRoute.averagePM25} µg/m³</span>
                </div>
                <div>
                  <span className="text-muted-foreground">PM2.5 สูงสุด:</span>{' '}
                  <span className="font-medium">{recommendedRoute.maxPM25} µg/m³</span>
                </div>
              </div>
            </div>

            {routes.length > 1 && (
              <div className="text-xs text-muted-foreground">
                พบ {routes.length} เส้นทาง - แสดงเส้นทางที่มี PM2.5 ต่ำที่สุด
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
