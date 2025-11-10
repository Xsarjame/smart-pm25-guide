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
    const OWM_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

    if (!OWM_API_KEY) {
      console.error('OPENWEATHER_API_KEY is not configured');
      throw new Error('OPENWEATHER_API_KEY is not configured');
    }

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air quality data from OpenWeatherMap Air Pollution API
    const owmResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${OWM_API_KEY}`
    );

    if (!owmResponse.ok) {
      const errorText = await owmResponse.text();
      console.error('OpenWeatherMap API error:', owmResponse.status, errorText);
      throw new Error(`OpenWeatherMap API error: ${owmResponse.status}`);
    }

    const owmData = await owmResponse.json();
    console.log('OpenWeatherMap air pollution data received:', owmData);

    if (!owmData.list || owmData.list.length === 0) {
      throw new Error('No air quality data available from OpenWeatherMap');
    }

    const airData = owmData.list[0];
    
    // Extract PM2.5 from OpenWeatherMap components
    const pm25 = airData.components?.pm2_5 || 0;
    
    // Get location name using reverse geocoding
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OWM_API_KEY}`
    );
    
    let location = 'Unknown Location';
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (geoData.length > 0) {
        const geo = geoData[0];
        location = geo.local_names?.th || geo.name || 'Unknown Location';
      }
    }
    
    // Extract timestamp
    const timestamp = new Date(airData.dt * 1000).toISOString();

    // Fetch current weather for temperature and humidity
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OWM_API_KEY}&units=metric`
    );

    let temperature = 25;
    let humidity = 60;

    if (weatherResponse.ok) {
      const weatherData = await weatherResponse.json();
      temperature = Math.round(weatherData.main?.temp || 25);
      humidity = Math.round(weatherData.main?.humidity || 60);
    }

    console.log('Processed air quality data:', { pm25, location, temperature, humidity });
    
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
