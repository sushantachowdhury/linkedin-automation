import { GoogleGenAI } from '@google/genai';
import { logEvent } from './store.js';

/**
 * Generate a LinkedIn post using Gemini API, or fall back to high-quality mock templates.
 * @param {Object} settings 
 * @param {String} title 
 * @param {String} analyticsStatus 
 * @returns {Promise<String>} Generated post content
 */
export async function generateDraftPost(settings, title, analyticsStatus) {
  const apiKey = settings.GEMINI_API_KEY;

  if (!apiKey) {
    logEvent('GEMINI_WARN', 'GEMINI_API_KEY not configured. Using high-quality mock template generator.');
    return generateMockPost(title, analyticsStatus);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are Sushanta Chowdhury, an experienced Frontend Developer and UI-UX specialist.
Write a professional, highly engaging, and value-packed LinkedIn post based on the following topic:
Topic: "${title}"
Include or reference the following live analytics insights or metrics:
Insights/Metrics: "${analyticsStatus}"

Guidelines:
1. Speak in first-person ("I", "my").
2. Keep the tone authentic, authoritative yet approachable. Avoid generic corporate jargon.
3. Structure the post with:
   - A hook (compelling opening line)
   - The core insight or problem
   - Actionable bullet points (key takeaways)
   - A call to action (encouraging discussion in the comments)
   - 3-5 relevant hashtags (e.g. #frontend, #uiux, #webdev, #css, #javascript)
4. Do not include placeholders like "[Insert Link]" or "[Your Name]". Write the complete, ready-to-post content.`;

    logEvent('GEMINI_INFO', `Requesting post generation from Gemini for topic: "${title}"`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const postContent = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!postContent) {
      throw new Error('Empty response from Gemini API');
    }

    logEvent('GEMINI_SUCCESS', 'Successfully drafted LinkedIn post using Gemini API.');
    return postContent.trim();
  } catch (err) {
    logEvent('GEMINI_ERROR', `Gemini generation failed: ${err.message}. Falling back to template.`);
    return generateMockPost(title, analyticsStatus);
  }
}

/**
 * Generate a template-based post for offline / mock fallback
 */
function generateMockPost(title, analyticsStatus) {
  const hooks = [
    `Unpopular opinion: Most frontend teams spend too much time on frameworks and too little time on Core Web Vitals.`,
    `Performance isn't just a technical metric. It's the first rule of UI/UX design.`,
    `We talk a lot about state management in modern web apps, but what about semantic HTML?`,
    `Here's something I learned recently while optimizing a complex layout for mobile users:`
  ];

  const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return `${randomHook}

Today, I wanted to share some thoughts on: "${title}".

When we look at our live triggers (${analyticsStatus || 'N/A'}), it's clear that performance optimization directly translates to user engagement. If your application takes more than 2 seconds to load, you're already losing users before they even see your beautiful interface.

Key principles to keep in mind:
⚡ Lazy load non-critical components to optimize Largest Contentful Paint (LCP)
🎨 Utilize CSS custom properties for maintainable theme systems
📱 Leverage container queries for truly responsive components, not just media queries
♿ Keep accessibility (a11y) at the center of your design from day one

What's your take? Do you prioritize immediate performance or rich animations when starting a new project? Let's discuss in the comments below!

#frontend #webdevelopment #uiux #responsivedesign #cleanui`;
}

