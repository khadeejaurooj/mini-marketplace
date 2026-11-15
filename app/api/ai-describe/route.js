// =====================================================================
// POST /api/ai-describe  (runs on the SERVER)
// AI feature: the seller uploads a product photo and Google Gemini
// suggests a title and description. Gemini has a free API tier.
// The API key stays on the server (env variable). We call the API with
// plain fetch - no extra library needed.
// =====================================================================
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabaseServer';

// "flash-lite" = Google's fastest model (~1-2 seconds). The bigger "flash"
// model took over 60 seconds in testing, which is too slow for a form.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

const PROMPT =
  'You help sellers list products on an online marketplace. Look at this product photo and reply with ONLY a JSON object: ' +
  '{"title": "short product title, max 60 characters", "description": "2-3 sentence friendly product description"}. ' +
  'Do not mention brand names.';

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== 'seller') {
    return NextResponse.json({ error: 'Sellers only.' }, { status: 401 });
  }

  const { imageBase64 } = await request.json();
  if (!imageBase64) return NextResponse.json({ error: 'No image sent.' }, { status: 400 });

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }, // the photo
            { text: PROMPT }, // what we want back
          ],
        },
      ],
      // Ask Gemini to answer in JSON so we can read it reliably.
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message || 'AI request failed' }, { status: 500 });
  }

  // Gemini replies with text; we pull out the JSON part and read it.
  try {
    const text = data.candidates[0].content.parts[0].text;
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return NextResponse.json({ title: json.title, description: json.description });
  } catch {
    return NextResponse.json({ error: 'AI gave an unexpected answer, please try again.' }, { status: 500 });
  }
}
