import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: "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" });

app.post("/generate-notes", async (req, res) => {
  try {
    const { topic, level, focus } = req.body;

    const prompt = `Generate structured study notes for the topic: ${topic}
Detail Level: ${level || "intermediate"}
Study Focus: ${focus || "general"}

Format the response as a single valid JSON object with EXACTLY these keys:
{
  "title": "Full formal title for the topic",
  "explanation": "Clear academic explanation in 3-4 sentences",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5", "point 6"],
  "concepts": [
    { "name": "Concept/Stage Name", "detail": "One to two sentence description" },
    { "name": "Concept/Stage Name", "detail": "One to two sentence description" },
    { "name": "Concept/Stage Name", "detail": "One to two sentence description" },
    { "name": "Concept/Stage Name", "detail": "One to two sentence description" }
  ],
  "applications": [
    { "icon": "🔬", "title": "Application Area", "text": "Brief description" },
    { "icon": "🏭", "title": "Application Area", "text": "Brief description" },
    { "icon": "💡", "title": "Application Area", "text": "Brief description" },
    { "icon": "🌍", "title": "Application Area", "text": "Brief description" }
  ],
  "summary": "A concise 2-3 sentence exam-ready summary of the most important points."
}

Return ONLY the JSON object. No markdown, no backticks, no extra text.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const rawText = completion.choices[0].message.content;

    // Strip accidental markdown fences if any
    const clean = rawText.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(clean);

    res.json(data);

  } catch (error) {
    console.error("Groq error:", error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
app.post("/generate-quiz", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;

    const prompt = `Generate a multiple choice quiz about: ${topic}
Difficulty: ${difficulty || "medium"}

Return a JSON array of EXACTLY 5 questions. Each question must follow this exact structure:
[
  {
    "question": "The question text here?",
    "options": [
      "A) First option",
      "B) Second option",
      "C) Third option",
      "D) Fourth option"
    ],
    "correct": 0
  }
]

Rules:
- "correct" is the index (0, 1, 2, or 3) of the correct answer in the options array
- All 4 options must be plausible, not obviously wrong
- Questions should test real understanding, not just memorization
- Adjust complexity based on the difficulty level
- Return ONLY the JSON array. No markdown, no backticks, no extra text.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const rawText = completion.choices[0].message.content;
    const clean = rawText.replace(/```json|```/gi, "").trim();
    const questions = JSON.parse(clean);

    res.json(questions);

  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({ error: "Quiz generation failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
