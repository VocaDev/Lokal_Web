import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, industry, tagline, primaryColor, layoutStyle, sections } = body;

    const prompt = `You are an expert web designer. Generate a complete, 
single-file HTML website for a business with these specifications:

Business Name: ${businessName}
Industry: ${industry}
Tagline: ${tagline}
Primary Color: ${primaryColor}
Layout Style: ${layoutStyle}
Sections to include: ${sections.join(", ")}

DESIGN REQUIREMENTS:
- Use Tailwind CSS via CDN: 
  <script src="https://cdn.tailwindcss.com"></script>
- Dark background theme: #0a0a0f for page, #151522 for cards
- Primary color: ${primaryColor} for buttons and accents
- Secondary color: #8b5cf6 (violet) for gradients and highlights
- Font: Import DM Sans from Google Fonts
- Fully responsive, mobile-first design
- Smooth scroll behavior

SECTIONS TO INCLUDE (only the ones listed above):
- hero: Full-width hero with business name, tagline, and CTA button
- services: Grid of service cards (use placeholder service names 
  based on industry)
- hours: Business hours table (Mon-Fri 9:00-18:00, Sat 10:00-15:00, 
  Sun closed)
- booking: "Book Now" section with a simple form 
  (name, phone, service select, date)
- contact: Contact section with phone, address, WhatsApp button
- gallery: Image gallery grid with placeholder colored divs
- testimonials: 3 customer testimonial cards with placeholder text

LAYOUT STYLES:
- modern: Use gradient backgrounds on hero, rounded cards, 
  gradient buttons
- minimal: Clean whitespace, simple borders, flat buttons
- bold: Large typography, high contrast, strong CTAs
- elegant: Serif-like spacing, subtle animations, luxury feel

TECHNICAL REQUIREMENTS:
- Single HTML file, no external dependencies except Tailwind CDN 
  and Google Fonts
- All CSS via Tailwind utility classes + a small <style> block 
  for custom properties
- Include this booking form that submits to #: 
  name input, phone input, service select, date picker, submit button
- Include smooth scroll links in navbar
- Add a sticky navbar with business name/logo and nav links
- Footer with business name, quick links, social placeholders
- The HTML must be complete and valid 
  (starts with <!DOCTYPE html>, ends with </html>)
- Do NOT use Lorem Ipsum — use realistic placeholder content 
  based on the industry and business name
- Do NOT include any JavaScript frameworks — vanilla JS only 
  for any interactions

Return ONLY the HTML code, wrapped in \`\`\`html ... \`\`\` markers. 
No explanation, no commentary.`;

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
      throw new Error(errorData.error?.message || 'Failed to call Groq API');
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
    console.error('Groq API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
