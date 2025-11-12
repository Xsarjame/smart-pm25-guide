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
    const { latitude, longitude } = await req.json();

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air quality data from Open-Meteo (no API key required)
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5&timezone=auto&domains=cams_global`;
    const airQualityResponse = await fetch(airQualityUrl);

    if (!airQualityResponse.ok) {
      const errorText = await airQualityResponse.text();
      console.error('Open-Meteo Air Quality API error:', airQualityResponse.status, errorText);
      throw new Error(`Open-Meteo Air Quality API error: ${airQualityResponse.status}`);
    }

    const airQualityData = await airQualityResponse.json();
    console.log('Open-Meteo air quality data received:', airQualityData);

    if (!airQualityData.current) {
      throw new Error('No air quality data available');
    }
    
    // Extract PM2.5 from Open-Meteo data
    const pm25 = airQualityData.current.pm2_5 || 0;
    
    // Fetch weather data from Open-Meteo for temperature and humidity
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    
    let temperature = 25;
    let humidity = 60;
    let location = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    
    if (weatherResponse.ok) {
      const weatherData = await weatherResponse.json();
      temperature = Math.round(weatherData.current?.temperature_2m || 25);
      humidity = Math.round(weatherData.current?.relative_humidity_2m || 60);
    }
    
    // Try to get location name using reverse geocoding (optional)
    try {
      const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1`;
      const geocodeResponse = await fetch(geocodeUrl);
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.results && geocodeData.results.length > 0) {
          location = geocodeData.results[0].name || location;
        }
      }
    } catch (error) {
      console.log('Geocoding optional, skipping:', error);
    }
    
    const timestamp = new Date().toISOString();
    
    return new Response(
      JSON.stringify({
        pm25: Math.round(pm25),
        location,
        timestamp,
        temperature,
        humidity,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-air-quality function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
