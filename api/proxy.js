// This function acts as a secure proxy to the OpenAI API.
export const config = {
  runtime: 'edge', // Use the Vercel Edge Runtime for speed and streaming
};

export default async function handler(req) {
  // We only want to handle POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Extract the 'messages' from the request body sent by your frontend.
    const { messages } = await req.json();

    // ⛔️ IMPORTANT: Do NOT paste your API key here.
    // Set your API key as an Environment Variable named OPENAI_API_KEY
    // in your Vercel project settings dashboard.
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured on the server' }), { status: 500 });
    }

    // Prepare the request to send to the OpenAI API.
    const openaiRequest = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-nano', // Using the specified gpt-5-nano model
        messages: messages,
        stream: true,
        prompt: {
          id: "pmpt_689c3ab2c4a881938b4d6744f1fbd56706a94ab96827d860",
          version: "2"
        }
      }),
    };

    // Make the call to the OpenAI API.
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', openaiRequest);

    // If the request to OpenAI fails, return an error.
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      return new Response(JSON.stringify(errorData), { status: openaiResponse.status });
    }
    
    // Return the streaming response from OpenAI directly to our frontend.
    return new Response(openaiResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}