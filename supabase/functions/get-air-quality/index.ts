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
    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

    if (!OPENWEATHER_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY is not configured');
    }

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air pollution data
    const pollutionResponse = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`
    );

    if (!pollutionResponse.ok) {
      const errorText = await pollutionResponse.text();
      console.error('OpenWeather API error:', pollutionResponse.status, errorText);
      throw new Error(`OpenWeather API error: ${pollutionResponse.status}`);
    }

    const pollutionData = await pollutionResponse.json();
    console.log('Air pollution data received:', pollutionData);

    // Fetch weather data for temperature and humidity
    const weatherResponse = await fetch(
      `http://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );

    let temperature = 25;
    let humidity = 60;
    
    if (weatherResponse.ok) {
      const weatherData = await weatherResponse.json();
      temperature = Math.round(weatherData.main.temp);
      humidity = weatherData.main.humidity;
    }

    // Fetch location name
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OPENWEATHER_API_KEY}`
    );

    let location = 'Unknown Location';
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (geoData.length > 0) {
        const city = geoData[0].name || geoData[0].local_names?.th || 'Unknown';
        const country = geoData[0].country || '';
        location = `${city}, ${country}`;
      }
    }

    const pm25 = pollutionData.list[0].components.pm2_5;
    const timestamp = new Date(pollutionData.list[0].dt * 1000).toISOString();
    
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
