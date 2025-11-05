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
    const IQAIR_API_KEY = Deno.env.get('IQAIR_API_KEY');

    if (!IQAIR_API_KEY) {
      throw new Error('IQAIR_API_KEY is not configured');
    }

    console.log('Fetching air quality data for:', { latitude, longitude });

    const response = await fetch(
      `https://api.airvisual.com/v2/nearest_city?lat=${latitude}&lon=${longitude}&key=${IQAIR_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IQAir API error:', response.status, errorText);
      throw new Error(`IQAir API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Air quality data received:', data);

    const { current } = data.data;
    
    return new Response(
      JSON.stringify({
        pm25: current.pollution.aqius,
        location: `${data.data.city}, ${data.data.country}`,
        timestamp: current.pollution.ts,
        temperature: current.weather.tp,
        humidity: current.weather.hu,
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
