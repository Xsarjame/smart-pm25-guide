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

    // Fetch air quality data from Open-Meteo (free, no API key required)
    const airQualityResponse = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5,european_aqi`
    );

    if (!airQualityResponse.ok) {
      const errorText = await airQualityResponse.text();
      console.error('Open-Meteo Air Quality API error:', airQualityResponse.status, errorText);
      throw new Error(`Air Quality API error: ${airQualityResponse.status}`);
    }

    const airQualityData = await airQualityResponse.json();
    console.log('Air quality data received:', airQualityData);

    // Fetch weather data from Open-Meteo for temperature and humidity
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`
    );

    let temperature = 25;
    let humidity = 60;
    
    if (weatherResponse.ok) {
      const weatherData = await weatherResponse.json();
      temperature = Math.round(weatherData.current.temperature_2m);
      humidity = Math.round(weatherData.current.relative_humidity_2m);
    }

    // Fetch location name from Open-Meteo geocoding
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`
    );

    let location = 'Unknown Location';
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (geoData.results && geoData.results.length > 0) {
        const result = geoData.results[0];
        location = result.name || 'Unknown Location';
        if (result.admin1) location += `, ${result.admin1}`;
        if (result.country) location += `, ${result.country}`;
      }
    }

    const pm25 = Math.round(airQualityData.current.pm2_5 || 0);
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
