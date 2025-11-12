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
    const OWM_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');

    if (!OWM_API_KEY) {
      throw new Error('OPENWEATHERMAP_API_KEY is not configured');
    }

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air quality data from OpenWeatherMap
    const owmUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${OWM_API_KEY}`;
    const owmResponse = await fetch(owmUrl);

    if (!owmResponse.ok) {
      const errorText = await owmResponse.text();
      console.error('OpenWeatherMap API error:', owmResponse.status, errorText);
      throw new Error(`OpenWeatherMap API error: ${owmResponse.status}`);
    }

    const owmData = await owmResponse.json();
    console.log('OpenWeatherMap data received:', owmData);

    if (!owmData.list || owmData.list.length === 0) {
      throw new Error('No air quality data available');
    }

    const airData = owmData.list[0];
    
    // Extract PM2.5 from OpenWeatherMap data
    const pm25 = airData.components?.pm2_5 || 0;
    
    // Fetch weather data for temperature and humidity
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OWM_API_KEY}&units=metric`;
    const weatherResponse = await fetch(weatherUrl);
    
    let temperature = 25;
    let humidity = 60;
    let location = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    
    if (weatherResponse.ok) {
      const weatherData = await weatherResponse.json();
      temperature = Math.round(weatherData.main?.temp || 25);
      humidity = Math.round(weatherData.main?.humidity || 60);
      location = weatherData.name || location;
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
