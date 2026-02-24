import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { commentaryName, book, chapter, verse } = await req.json();
    
    console.log(`Fetching from Sefaria: ${commentaryName} on ${book} ${chapter}:${verse}`);

    // Build Sefaria API URL
    // Targum Onkelos uses a different ref format
    let ref: string;
    if (commentaryName === "Onkelos") {
      ref = `Onkelos ${book} ${chapter}:${verse}`;
    } else if (commentaryName === "HaEmek_Davar") {
      ref = `Haamek Davar on ${book} ${chapter}:${verse}`;
    } else if (commentaryName === "Metzudat_David") {
      ref = `Metzudat David on ${book} ${chapter}:${verse}`;
    } else if (commentaryName === "Daat_Zkenim") {
      ref = `Da'at Zkenim on ${book} ${chapter}:${verse}`;
    } else if (commentaryName === "Alshich") {
      ref = `Alshich on ${book} ${chapter}:${verse}`;
    } else if (commentaryName === "Malbim") {
      ref = `Malbim on ${book} ${chapter}:${verse}`;
    } else if (commentaryName === "Chizkuni") {
      ref = `Chizkuni, ${book} ${chapter}:${verse}`;
    } else {
      ref = `${commentaryName.replace(/_/g, ' ')} on ${book} ${chapter}:${verse}`;
    }
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`;
    
    console.log(`Sefaria URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Torah-Study-App/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Sefaria API error: ${response.status} - ${errorText}`);
      
      // Return a more informative error
      return new Response(
        JSON.stringify({ 
          error: `Sefaria returned ${response.status}`,
          details: errorText,
          requestedRef: ref
        }), 
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('Successfully fetched from Sefaria');

    // Extract Hebrew text from the response
    const hebrewText = data.he || data.text || '';
    
    return new Response(JSON.stringify({
      text: Array.isArray(hebrewText) ? hebrewText.join(' ') : hebrewText,
      ref: data.ref || ref,
      heRef: data.heRef || '',
      fullData: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-sefaria function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to fetch from Sefaria API',
        stack: error instanceof Error ? error.stack : undefined
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});