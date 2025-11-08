import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startLat, startLng, endLat, endLng } = await req.json();
    
    console.log('Route PM2.5 request:', { startLat, startLng, endLat, endLng });

    const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
    const AQICN_API_KEY = Deno.env.get('AQICN_API_KEY');

    if (!MAPBOX_API_KEY || !AQICN_API_KEY) {
      throw new Error('API keys not configured');
    }

    // Get multiple route alternatives from Mapbox
    const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?alternatives=true&geometries=geojson&steps=true&access_token=${MAPBOX_API_KEY}`;
    
    const mapboxResponse = await fetch(mapboxUrl);
    
    if (!mapboxResponse.ok) {
      console.error('Mapbox error:', await mapboxResponse.text());
      throw new Error('Failed to get routes from Mapbox');
    }

    const mapboxData = await mapboxResponse.json();
    const routes = mapboxData.routes || [];

    if (routes.length === 0) {
      throw new Error('No routes found');
    }

    // Analyze PM2.5 along each route
    const routesWithPM25 = await Promise.all(
      routes.map(async (route: any, index: number) => {
        const coordinates = route.geometry.coordinates;
        
        // Sample points along the route (every 5km approximately)
        const samplePoints: number[][] = [];
        const totalDistance = route.distance; // meters
        const sampleInterval = 5000; // 5km
        const numSamples = Math.min(Math.ceil(totalDistance / sampleInterval), 10); // Max 10 samples
        
        for (let i = 0; i <= numSamples; i++) {
          const ratio = i / numSamples;
          const coordIndex = Math.floor(ratio * (coordinates.length - 1));
          samplePoints.push(coordinates[coordIndex]);
        }

        // Get PM2.5 data for each sample point
        const pm25Values = await Promise.all(
          samplePoints.map(async ([lng, lat]) => {
            try {
              const aqicnUrl = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${AQICN_API_KEY}`;
              const response = await fetch(aqicnUrl);
              const data = await response.json();
              
              if (data.status === 'ok' && data.data?.iaqi?.pm25?.v) {
                return data.data.iaqi.pm25.v;
              }
              return null;
            } catch (error) {
              console.error(`Error fetching PM2.5 for point ${lat},${lng}:`, error);
              return null;
            }
          })
        );

        // Calculate average PM2.5 (excluding null values)
        const validPM25 = pm25Values.filter(v => v !== null) as number[];
        const avgPM25 = validPM25.length > 0 
          ? validPM25.reduce((sum, val) => sum + val, 0) / validPM25.length 
          : 0;
        
        const maxPM25 = validPM25.length > 0 ? Math.max(...validPM25) : 0;

        return {
          routeIndex: index,
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration,
          averagePM25: Math.round(avgPM25),
          maxPM25: Math.round(maxPM25),
          pm25Samples: pm25Values.filter(v => v !== null).map(v => Math.round(v as number)),
          sampleLocations: samplePoints,
        };
      })
    );

    // Sort routes by average PM2.5 (lower is better)
    routesWithPM25.sort((a, b) => a.averagePM25 - b.averagePM25);

    console.log('Routes analyzed:', routesWithPM25.map(r => ({
      index: r.routeIndex,
      avgPM25: r.averagePM25,
      maxPM25: r.maxPM25,
      distance: r.distance,
      duration: r.duration
    })));

    return new Response(JSON.stringify({ 
      routes: routesWithPM25,
      recommendedRoute: routesWithPM25[0], // Route with lowest PM2.5
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-route-pm25:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการวิเคราะห์เส้นทาง' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
