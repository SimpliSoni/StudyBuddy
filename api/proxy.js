// This function acts as a secure proxy to the OpenAI API.
export const config = {
  runtime: 'edge', // Use the Vercel Edge Runtime for speed and streaming
};

import OpenAI from 'openai';

export default async function handler(req) {
  // We only want to handle POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Extract the 'messages' from the request body sent by your frontend.
    const { messages } = await req.json();

    // Initialize the OpenAI client
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on the server' }), { status: 500 });
    }

    // Create the streaming response with the specified prompt ID
    const stream = await client.chat.completions.create({
      model: 'gpt-5-nano', // Using the specified gpt-5-nano model
      messages: messages,
      stream: true,
      prompt: {
        id: "pmpt_689c3ab2c4a881938b4d6744f1fbd56706a94ab96827d860",
        version: "2"
      }
    });

    // Convert the stream to a readable stream for the frontend
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            const data = encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
            controller.enqueue(data);
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    // Return the streaming response
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}