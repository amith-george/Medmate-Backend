const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const handleChat = async (req, res) => {
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ message: 'Message is required' });

  // 1. Failsafe Logic: Set a timeout
  let streamStarted = false;
  const TIMEOUT_LIMIT = 45000; // 45 Seconds

  const timeoutId = setTimeout(() => {
    if (!streamStarted) {
      console.error("Gemini Timeout: No response after 45s");
      const failsafeMsg = "I'm having trouble connecting to my medical database right now. Please try again in a moment.";
      res.write(`data: ${JSON.stringify({ text: failsafeMsg })}\r\n\r\n`);
      res.write('data: [DONE]\r\n\r\n');
      res.end();
    }
  }, TIMEOUT_LIMIT);

  try {
    const model = genAI.getGenerativeModel({ 
      // Use gemini-2.5-flash for better performance and gemini-flash-latest for more quota.
      model: 'gemini-2.5-flash', 
      systemInstruction: {
        parts: [{ text: `
          You are MedMate, a professional health assistant. 
          RULES: 1. Answer ONLY health/medicine queries. 2. Be concise. 3. No definitive diagnoses.
        `}]
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); 
    res.flushHeaders(); 

    const chat = model.startChat({
      history: history || [],
      generationConfig: { 
        maxOutputTokens: 850,
        temperature: 0.2, // Lower temperature = faster, more deterministic tokens
      },
    });

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      // Clear the timeout as soon as the first token arrives
      if (!streamStarted) {
        streamStarted = true;
        clearTimeout(timeoutId);
      }

      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ text: chunkText })}\r\n\r\n`);
      if (res.flush) res.flush(); 
    }

    const disclaimer = "\n\n(Consult a doctor for medical concerns.)";
    res.write(`data: ${JSON.stringify({ text: disclaimer })}\r\n\r\n`);
    res.write('data: [DONE]\r\n\r\n');
    res.end();

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Gemini Stream Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Stream failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Connection lost" })}\r\n\r\n`);
      res.end();
    }
  }
};

module.exports = { handleChat };