import { GoogleGenAI } from '@google/genai';
import { logEvent } from './store.js';

/**
 * Generate three LinkedIn post alternatives using Gemini API, or fall back to high-quality mock templates.
 * @param {Object} settings 
 * @param {String} title 
 * @param {String} analyticsStatus 
 * @returns {Promise<Array<String>>} List of 3 generated post contents
 */
export async function generateDraftPost(settings, title, analyticsStatus) {
  const apiKey = settings.GEMINI_API_KEY;

  if (!apiKey) {
    logEvent('GEMINI_WARN', 'GEMINI_API_KEY not configured. Using high-quality mock template generator.');
    return generateMockPosts(title, analyticsStatus);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are Sushanta Chowdhury, an experienced Frontend Developer and UI-UX specialist.
Write 3 alternative professional, highly engaging, and value-packed LinkedIn posts based on the following topic:
Topic: "${title}"
Include or reference the following live analytics insights or metrics:
Insights/Metrics: "${analyticsStatus}"

Guidelines for each post alternative:
1. Speak in first-person ("I", "my").
2. Keep the tone authentic, authoritative yet approachable. Avoid generic corporate jargon.
3. Structure each post with:
   - A hook (compelling opening line)
   - The core insight or problem
   - Actionable bullet points (key takeaways)
   - A call to action (encouraging discussion in the comments)
   - 3-5 relevant hashtags (e.g. #frontend, #uiux, #webdev, #css, #javascript)
4. Do not include placeholders like "[Insert Link]" or "[Your Name]". Write the complete, ready-to-post content.
5. Ensure the 3 alternatives are distinctly different in style, angle, or focus (e.g. Option 1 focuses on technical optimization/code, Option 2 on user/employee experience & UI-UX design, Option 3 on general industry best practices & business value).

Return your response strictly in the following JSON format:
{
  "options": [
    "Text of Option 1 here...",
    "Text of Option 2 here...",
    "Text of Option 3 here..."
  ]
}`;

    logEvent('GEMINI_INFO', `Requesting 3 post options from Gemini for topic: "${title}"`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            options: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Three alternative LinkedIn post drafts.'
            }
          },
          required: ['options']
        }
      }
    });

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const data = JSON.parse(text);
    if (!data.options || !Array.isArray(data.options) || data.options.length < 3) {
      throw new Error('Invalid JSON structure or fewer than 3 options returned');
    }

    logEvent('GEMINI_SUCCESS', 'Successfully drafted 3 LinkedIn post alternatives using Gemini API.');
    return data.options.slice(0, 3).map(opt => opt.trim());
  } catch (err) {
    logEvent('GEMINI_ERROR', `Gemini generation failed: ${err.message}. Falling back to templates.`);
    return generateMockPosts(title, analyticsStatus);
  }
}

/**
 * Generate 3 template-based posts for offline / mock fallback
 */
function generateMockPosts(title, analyticsStatus) {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  return [
    `Unpopular opinion: Most frontend teams spend too much time on frameworks and too little time on Core Web Vitals.

Today, I wanted to share some thoughts on: "${title}".

When we look at our live triggers (${analyticsStatus || 'N/A'}), it's clear that performance optimization directly translates to user engagement. If your application takes more than 2 seconds to load, you're already losing users before they even see your beautiful interface.

Key principles to keep in mind:
⚡ Lazy load non-critical components to optimize Largest Contentful Paint (LCP)
🎨 Utilize CSS custom properties for maintainable theme systems
📱 Leverage container queries for truly responsive components

What's your take? Let's discuss in the comments below!

---
Generated on: ${dateStr}
#frontend #webdevelopment #uiux #performance`,

    `Performance isn't just a technical metric. It's the first rule of UI/UX design.

Today, I wanted to share some thoughts on: "${title}".

If the user interface feels slow, it feels broken. When we look at our live metrics (${analyticsStatus || 'N/A'}), it is vital that our tools—whether consumer apps or enterprise HRMS software—remain highly responsive. Good design is invisible; fast feedback is essential.

Key design principles:
✨ Keep micro-interactions under 100ms to maintain flow
🎨 Use visual skeletons instead of loading spinners to reduce perceived wait time
♿ Ensure touch targets are large and accessible on all screens

Do you prioritize immediate performance or rich animations when starting a new project? Let's discuss!

---
Generated on: ${dateStr}
#uiux #frontend #designsystem #webdev`,

    `We talk a lot about state management in modern web apps, but what about semantic HTML and basic accessibility?

Today, I wanted to share some thoughts on: "${title}".

A robust and secure enterprise platform (like a HRMS or ERP system) relies heavily on clean markup. When we track triggers (${analyticsStatus || 'N/A'}), accessibility (a11y) should be integrated from day one, not as an afterthought.

Key best practices:
♿ Use proper ARIA attributes and keyboard-focusable elements
🔒 Secure all form inputs with proper validation and autocomplete attributes
📱 Design mobile-first layouts that scale gracefully

What's your take? How do you ensure accessibility in your team's codebases?

---
Generated on: ${dateStr}
#a11y #webdevelopment #webstandards #accessibility`
  ];
}

