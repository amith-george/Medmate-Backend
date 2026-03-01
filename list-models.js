require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("🔑 Using API Key:", apiKey ? "Loaded (Starts with " + apiKey.substring(0, 4) + ")" : "MISSING!");

  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY is missing from .env file");
    return;
  }

  console.log("📡 Connecting to Google API to list models...");
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    const data = await response.json();

    if (data.error) {
      console.error("\n❌ API returned an error:");
      console.error(JSON.stringify(data.error, null, 2));
      return;
    }

    if (!data.models) {
        console.log("\n⚠️ No models found. Is the 'Generative Language API' enabled in Google Cloud Console?");
        return;
    }

    console.log("\n✅ AVAILABLE MODELS FOR YOU:");
    data.models.forEach(model => {
      // We only care about models that support 'generateContent' (Chat)
      if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
        console.log(`Model Name: ${model.name}`);
        console.log(`   Display: ${model.displayName}`);
      }
    });

  } catch (error) {
    console.error("❌ Network Error:", error.message);
  }
}

listModels();