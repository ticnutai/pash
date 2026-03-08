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

    // Build Sefaria API refs (try multiple aliases when needed)
    let refs: string[] = [];
    if (commentaryName === "Onkelos") {
      refs = [`Onkelos ${book} ${chapter}:${verse}`];
    } else if (commentaryName === "HaEmek_Davar") {
      refs = [`Haamek Davar on ${book} ${chapter}:${verse}`];
    } else if (commentaryName === "Metzudat_David") {
      refs = [`Metzudat David on ${book} ${chapter}:${verse}`];
    } else if (commentaryName === "Daat_Zkenim") {
      refs = [`Da'at Zkenim on ${book} ${chapter}:${verse}`];
    } else if (commentaryName === "Alshich") {
      refs = [`Alshich on ${book} ${chapter}:${verse}`];
    } else if (commentaryName === "Malbim") {
      refs = [`Malbim on ${book} ${chapter}:${verse}`];
    } else if (commentaryName === "Chizkuni") {
      refs = [`Chizkuni, ${book} ${chapter}:${verse}`];
    } else if (commentaryName === "Beur_HaGra") {
      refs = [
        `Beur HaGra on ${book} ${chapter}:${verse}`,
        `Biur HaGra on ${book} ${chapter}:${verse}`,
        `Vilna Gaon on ${book} ${chapter}:${verse}`,
        `HaGra on ${book} ${chapter}:${verse}`,
      ];
    } else {
      refs = [`${commentaryName.replace(/_/g, ' ')} on ${book} ${chapter}:${verse}`];
    }
    let data: any = null;
    let usedRef: string | null = null;
    let lastStatus = 0;
    let lastErrorText = '';

    for (const ref of refs) {
      const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`;
      console.log(`Sefaria URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Torah-Study-App/1.0'
        }
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastErrorText = await response.text();
        continue;
      }

      const candidate = await response.json();
      const candidateText = candidate?.he || candidate?.text;
      if (candidateText && !(Array.isArray(candidateText) && candidateText.length === 0)) {
        data = candidate;
        usedRef = ref;
        break;
      }
    }

    if (!data) {
      return new Response(
        JSON.stringify({
          error: `Sefaria returned ${lastStatus || 404}`,
          details: lastErrorText || 'No text found for requested refs',
          requestedRefs: refs
        }),
        {
          status: lastStatus || 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Successfully fetched from Sefaria with ref: ${usedRef}`);

    // Extract Hebrew text from the response
    const hebrewText = data.he || data.text || '';
    
    return new Response(JSON.stringify({
      text: Array.isArray(hebrewText) ? hebrewText.join(' ') : hebrewText,
      ref: data.ref || usedRef,
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