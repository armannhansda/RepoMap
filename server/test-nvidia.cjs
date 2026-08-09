const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: "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",
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function run() {
  try {
    const completion = await openai.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: "Hello world" }],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      stream: false
    });
    console.log(completion.choices[0]?.message?.content);
  } catch (err) {
    console.error("Error:", err.message, err.status, err.response?.data);
  }
}

run();
