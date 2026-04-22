import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    console.error('[generate-website] GROQ_API_KEY is not set in environment variables');
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { businessName, industry, tagline, primaryColor, layoutStyle, sections } = body;

    const prompt = `You are a world-class web designer and developer. Generate a stunning, complete, single-file HTML website for a business. Make it look like it was designed by a top-tier creative agency — not a template.

Business Name: ${businessName}
Industry: ${industry}
Tagline: ${tagline}
Primary Color: ${primaryColor}
Layout Style: ${layoutStyle}
Sections to include: ${sections.join(", ")}

DESIGN REQUIREMENTS:
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Dark background theme: #0a0a0f for page background, #151522 for cards, #1e1e35 for inputs
- Primary color: ${primaryColor} for buttons, accents, and highlights
- Gradient accent: linear-gradient(135deg, ${primaryColor}, #8b5cf6) for hero and CTAs
- Borders: rgba(120,120,255,0.12) default, rgba(120,120,255,0.22) on hover
- Font: Import DM Sans from Google Fonts for all text
- Fully responsive, mobile-first design
- Smooth scroll behavior on all nav links
- The design must feel premium, modern, and unmistakably specific to the ${industry} industry in Kosovo

SECTIONS (only include the ones listed above):
- hero: Full viewport height hero with large bold business name, tagline, two CTA buttons (Book Now + Learn More), gradient background with subtle animated blob effects
- services: Grid of 3-6 service cards with relevant emoji icons, realistic service names and prices in EUR for ${industry}
- hours: Clean business hours table (Mon-Fri 9:00-18:00, Sat 10:00-15:00, Sun closed)
- booking: Styled booking section with form (name, phone, service select, date picker, gradient submit button)
- contact: Contact section with phone, address, email, and a green WhatsApp button
- gallery: Image gallery grid using gradient-colored placeholder divs with overlay captions
- testimonials: 3 customer testimonial cards with realistic Kosovar names, 5-star ratings (★★★★★), and specific feedback for ${industry}

LAYOUT STYLES:
- modern: Gradient hero, rounded-2xl cards, gradient buttons, subtle glow effects
- minimal: Clean whitespace, thin borders, flat design, lots of breathing room
- bold: Large 80px+ hero text, high contrast, strong CTAs, full-width colored sections
- elegant: Generous spacing, refined typography, subtle fade animations, luxury aesthetic

TECHNICAL REQUIREMENTS:
- Single HTML file, complete and valid (starts with <!DOCTYPE html>, ends with </html>)
- Sticky navbar with business name and smooth scroll nav links, with mobile hamburger menu
- Hero section must be visually impressive — full viewport height, centered content, animated gradient blobs
- All cards must have hover effects (translateY, border glow)
- Footer with business name, quick links, social placeholders, copyright
- Use only Tailwind utility classes + a <style> block for custom CSS variables and keyframe animations
- Vanilla JS only — no frameworks
- Do NOT use Lorem Ipsum — use realistic, specific content for ${industry} and ${businessName}
- Do NOT leave placeholder text like [Your Address] — invent realistic Kosovo-specific details (addresses in Prishtinë, Prizren, Pejë, etc.)
- Make the booking form functional-looking with proper validation feedback styles

Return ONLY the HTML code, no explanation, no commentary, wrapped in \`\`\`html ... \`\`\` markers.`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8000,
          temperature: 0.7
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[generate-website] Groq API error:', JSON.stringify(errorData));
      throw new Error(errorData.error?.message || `Groq API returned ${response.status}`);
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ''

    // Extract HTML between ```html and ``` markers
    let extractedHtml = text;
    const htmlMatch = text.match(/```html([\s\S]*?)```/);
    if (htmlMatch) {
      extractedHtml = htmlMatch[1].trim();
    }

    return NextResponse.json({ html: extractedHtml });
  } catch (error: any) {
    console.error('[generate-website] Caught error:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
