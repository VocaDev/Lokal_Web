import re

def main():
    with open('prototype.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Standardize Sidebar
    # Find all <div class="dash-sidebar">...</div>
    sidebar_pattern = re.compile(r'<div class="dash-sidebar">.*?</button>\s*</div>\s*</div>\s*</div>\s*</div>', re.DOTALL)
    # Wait, the sidebar ends with:
    #             <div style="font-size:11px; color:var(--ink-4);" onclick="goto('1.3')">Dil</div>
    #           </div>
    #         </div>
    #       </div>
    #     </div>
    sidebar_end_pattern = re.compile(r'<div class="dash-sidebar">.*?(?:<div class="dash-main"|<div class="dash-main flex")', re.DOTALL)
    
    # Actually, we can just replace the sidebars explicitly.
    # It's better to use regex to find `<div class="dash-sidebar">` and its contents.
    
    # Let's extract the frames and replace inside them.
    # We can inject JS before `const FRAMES = [`
    
    js_injection = """
    const SIDEBAR_HTML = `
      <div class="logo mb-6 px-3">LokalWeb</div>
      <div class="card mb-6" style="padding:12px; background:var(--blue-tint-08); border:none;">
        <div style="font-weight:600; font-size:14px; color:var(--ink);">Arbër's Chair</div>
        <div class="mono" style="font-size:11px; color:var(--blue-600);">arbers-chair.lokalweb.com</div>
      </div>
      
      <div class="eyebrow px-3">MENAXHIMI</div>
      <div class="nav-item" data-nav="Përmbledhje" onclick="goto('5.1')">Përmbledhje</div>
      <div class="nav-item" data-nav="Rezervime" onclick="goto('5.2')">Rezervime <span class="badge badge-warning" style="margin-left:auto;">1</span></div>
      <div class="nav-item" data-nav="Shërbime" onclick="goto('5.3')">Shërbime</div>
      <div class="nav-item" data-nav="Orari" onclick="goto('5.4')">Orari</div>
      <div class="nav-item" data-nav="Galeri" onclick="goto('5.5')">Galeri</div>
      <div class="nav-item" data-nav="Profili" onclick="goto('5.7')">Profili</div>
      
      <div class="eyebrow px-3 mt-6">DIZAJNI</div>
      <div class="nav-item" data-nav="Personalizo" onclick="goto('5.6')">Personalizo</div>
      
      <div style="margin-top:auto;">
        <button class="btn btn-primary w-full mb-4" onclick="goto('2.1')">✦ Gjenero website</button>
        <div class="flex items-center gap-3 px-3 py-2 cursor-pointer" style="border-radius:var(--r-sm);">
          <div style="width:32px; height:32px; background:var(--surface-3); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600;">A</div>
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:500; line-height:1.2;">Arbër Hoxha</div>
            <div style="font-size:11px; color:var(--ink-4);" onclick="goto('1.3')">Dil</div>
          </div>
        </div>
      </div>
    `;

    function renderSidebars() {
      document.querySelectorAll('[data-sidebar-target]').forEach(container => {
        container.innerHTML = SIDEBAR_HTML;
        const activeNav = container.getAttribute('data-active');
        if (activeNav) {
          const el = container.querySelector(`[data-nav="${activeNav}"]`);
          if (el) el.classList.add('active');
        }
      });
    }
    
    """
    html = html.replace("const FRAMES = [", js_injection + "const FRAMES = [")
    html = html.replace("// Initialize Dropdown", "renderSidebars();\n    // Initialize Dropdown")
    
    # Replace the sidebars in frames.
    sidebar_replacements = [
        ('5.1', 'Përmbledhje'),
        ('5.2', 'Rezervime'),
        ('5.3', 'Shërbime'),
        ('5.4', 'Orari'),
        ('5.5', 'Galeri'),
        ('5.6', 'Personalizo'),
        ('5.7', 'Profili'),
        ('7.1', 'Rezervime'),
        ('7.2', 'Shërbime'),
        ('7.3', 'Galeri'),
        ('7.4', 'Personalizo')
    ]
    
    for frame_id, nav_name in sidebar_replacements:
        # Regex to find <div class="dash-sidebar">...</div> up to <div class="dash-main
        pattern = re.compile(rf'(<div class="frame"[^>]*data-frame="{frame_id}"[^>]*>.*?)(<div class="dash-sidebar">.*?)(<div class="dash-main)', re.DOTALL)
        def repl(m):
            return m.group(1) + f'<div class="dash-sidebar" data-sidebar-target data-active="{nav_name}"></div>\n          ' + m.group(3)
        html = pattern.sub(repl, html)

    # 7. Frame 4.1: Template Gallery - add 5 cards
    new_cards = """
              <!-- Template 4 -->
              <div class="card" style="padding:0; overflow:hidden; cursor:pointer;">
                <div style="height:200px; background:var(--ink); padding:24px; position:relative;">
                   <div style="font-family:'Geist', sans-serif; font-weight:700; font-size:28px; color:#fff; line-height:1;">Sharp.</div>
                </div>
                <div style="padding:16px;">
                  <div style="font-weight:600; margin-bottom:8px;">Sharp Cut</div>
                  <div class="flex gap-2"><span class="badge badge-neutral">Berbertari</span><span class="badge badge-neutral">Modern</span></div>
                </div>
              </div>
              <!-- Template 5 -->
              <div class="card" style="padding:0; overflow:hidden; cursor:pointer;">
                <div style="height:200px; background:#fff; padding:24px; border-bottom:1px solid var(--border);">
                   <div style="font-weight:400; font-size:24px;">Atelier.</div>
                   <div style="width:24px; height:1px; background:var(--blue-600); margin-top:4px;"></div>
                </div>
                <div style="padding:16px;">
                  <div style="font-weight:600; margin-bottom:8px;">Atelier</div>
                  <div class="flex gap-2"><span class="badge badge-neutral">Sallon</span><span class="badge badge-neutral">Premium</span></div>
                </div>
              </div>
              <!-- Template 6 -->
              <div class="card" style="padding:0; overflow:hidden; cursor:pointer;">
                <div style="height:200px; background:var(--surface-2); padding:24px;">
                   <div style="font-weight:700; font-size:28px; color:var(--blue-600); line-height:1;">IRON<br>FORGE.</div>
                </div>
                <div style="padding:16px;">
                  <div style="font-weight:600; margin-bottom:8px;">Iron Forge</div>
                  <div class="flex gap-2"><span class="badge badge-neutral">Palestra</span><span class="badge badge-neutral">Modern</span></div>
                </div>
              </div>
              <!-- Template 7 -->
              <div class="card" style="padding:0; overflow:hidden; cursor:pointer;">
                <div style="height:200px; background:var(--surface-2); padding:24px;">
                   <div style="font-weight:300; font-size:20px; color:var(--ink);">Studio Dentar</div>
                   <div style="color:var(--blue-600); font-size:24px; margin-top:4px;">+</div>
                </div>
                <div style="padding:16px;">
                  <div style="font-weight:600; margin-bottom:8px;">Dental Studio</div>
                  <div class="flex gap-2"><span class="badge badge-neutral">Klinika</span><span class="badge badge-neutral">Premium</span></div>
                </div>
              </div>
              <!-- Template 8 -->
              <div class="card" style="padding:0; overflow:hidden; cursor:pointer;">
                <div style="height:200px; background:var(--ink); padding:24px;">
                   <div style="font-family:'Geist', serif; font-style:italic; font-size:28px; color:var(--blue-400); line-height:1;">Tavolina.</div>
                </div>
                <div style="padding:16px;">
                  <div style="font-weight:600; margin-bottom:8px;">Tavolina</div>
                  <div class="flex gap-2"><span class="badge badge-neutral">Restorant</span><span class="badge badge-neutral">Klasik</span></div>
                </div>
              </div>
            </div>"""
    html = html.replace('</div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <!-- Frame 4.2', new_cards + '\n          </div>\n        </div>\n      </div>\n\n      <!-- Frame 4.2')

    # 8. Frame 5.4: Show all 7 days
    days_html = """
                <!-- Mon -->
                <div class="flex items-center gap-4 py-3 border-bottom">
                  <div style="width:100px; font-weight:500;">E Hënë</div>
                  <div style="width:40px; height:24px; background:var(--blue-600); border-radius:12px; position:relative;"><div style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; right:2px; top:2px;"></div></div>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="09:00">
                  <span>-</span>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="19:00">
                  <button class="btn btn-ghost btn-sm" style="margin-left:auto;">+ Shto</button>
                </div>
                <!-- Tue -->
                <div class="flex items-center gap-4 py-3 border-bottom">
                  <div style="width:100px; font-weight:500;">E Martë</div>
                  <div style="width:40px; height:24px; background:var(--blue-600); border-radius:12px; position:relative;"><div style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; right:2px; top:2px;"></div></div>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="09:00">
                  <span>-</span>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="19:00">
                  <button class="btn btn-ghost btn-sm" style="margin-left:auto;">+ Shto</button>
                </div>
                <!-- Wed -->
                <div class="flex items-center gap-4 py-3 border-bottom">
                  <div style="width:100px; font-weight:500;">E Mërkurë</div>
                  <div style="width:40px; height:24px; background:var(--blue-600); border-radius:12px; position:relative;"><div style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; right:2px; top:2px;"></div></div>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="09:00">
                  <span>-</span>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="19:00">
                  <button class="btn btn-ghost btn-sm" style="margin-left:auto;">+ Shto</button>
                </div>
                <!-- Thu -->
                <div class="flex items-center gap-4 py-3 border-bottom">
                  <div style="width:100px; font-weight:500;">E Enjte</div>
                  <div style="width:40px; height:24px; background:var(--blue-600); border-radius:12px; position:relative;"><div style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; right:2px; top:2px;"></div></div>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="09:00">
                  <span>-</span>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="19:00">
                  <button class="btn btn-ghost btn-sm" style="margin-left:auto;">+ Shto</button>
                </div>
                <!-- Fri -->
                <div class="flex items-center gap-4 py-3 border-bottom">
                  <div style="width:100px; font-weight:500;">E Premte</div>
                  <div style="width:40px; height:24px; background:var(--blue-600); border-radius:12px; position:relative;"><div style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; right:2px; top:2px;"></div></div>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="09:00">
                  <span>-</span>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="19:00">
                  <button class="btn btn-ghost btn-sm" style="margin-left:auto;">+ Shto</button>
                </div>
                <!-- Sat -->
                <div class="flex items-center gap-4 py-3 border-bottom">
                  <div style="width:100px; font-weight:500;">E Shtunë</div>
                  <div style="width:40px; height:24px; background:var(--blue-600); border-radius:12px; position:relative;"><div style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; right:2px; top:2px;"></div></div>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="09:00">
                  <span>-</span>
                  <input type="text" class="input" style="width:100px; padding:6px 12px; font-family:'Geist Mono';" value="16:00">
                  <button class="btn btn-ghost btn-sm" style="margin-left:auto;">+ Shto</button>
                </div>
                <!-- Sun Closed -->
                <div class="flex items-center gap-4 py-3 opacity-60">
                  <div style="width:100px; font-weight:500;">E Diel</div>
                  <div style="width:40px; height:24px; background:var(--surface-3); border-radius:12px; position:relative;"><div style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; left:2px; top:2px;"></div></div>
                  <div style="color:var(--ink-4); font-size:13px; font-style:italic;">Mbyllur</div>
                </div>"""
    html = re.sub(r'<!-- Mon -->.*?<!-- Sun Closed -->.*?</div>', days_html + '\n              </div>', html, flags=re.DOTALL)

    # 9. Frame 5.3: Show 6 services
    services_html = """
              <!-- Service 3 -->
              <div class="card-elevated">
                <div class="flex justify-between items-start mb-4">
                  <div style="font-weight:600; font-size:16px; color:var(--ink);">Mjekërr Klasike</div>
                  <div style="font-size:20px; font-weight:700; color:var(--blue-600);">€8</div>
                </div>
                <p style="font-size:13px; color:var(--ink-3); margin-bottom:16px;">Rregullim i mjekrrës me brisk dhe pomadë.</p>
                <div class="flex justify-between items-center">
                  <div class="mono" style="font-size:12px; background:var(--surface-2); padding:4px 8px; border-radius:4px;">20 min</div>
                  <div class="flex gap-2"><button class="btn-icon" style="font-size:12px;">✎</button><button class="btn-icon text-danger" style="font-size:12px;">🗑</button></div>
                </div>
              </div>
              <!-- Service 4 -->
              <div class="card-elevated">
                <div class="flex justify-between items-start mb-4">
                  <div style="font-weight:600; font-size:16px; color:var(--ink);">Larje + Masazh</div>
                  <div style="font-size:20px; font-weight:700; color:var(--blue-600);">€12</div>
                </div>
                <p style="font-size:13px; color:var(--ink-3); margin-bottom:16px;">Larje me shampo profesionale dhe masazh koke.</p>
                <div class="flex justify-between items-center">
                  <div class="mono" style="font-size:12px; background:var(--surface-2); padding:4px 8px; border-radius:4px;">25 min</div>
                  <div class="flex gap-2"><button class="btn-icon" style="font-size:12px;">✎</button><button class="btn-icon text-danger" style="font-size:12px;">🗑</button></div>
                </div>
              </div>
              <!-- Service 5 -->
              <div class="card-elevated">
                <div class="flex justify-between items-start mb-4">
                  <div style="font-weight:600; font-size:16px; color:var(--ink);">Prerje për fëmijë</div>
                  <div style="font-size:20px; font-weight:700; color:var(--blue-600);">€7</div>
                </div>
                <p style="font-size:13px; color:var(--ink-3); margin-bottom:16px;">Prerje e shpejtë për djem nën 12 vjeç.</p>
                <div class="flex justify-between items-center">
                  <div class="mono" style="font-size:12px; background:var(--surface-2); padding:4px 8px; border-radius:4px;">25 min</div>
                  <div class="flex gap-2"><button class="btn-icon" style="font-size:12px;">✎</button><button class="btn-icon text-danger" style="font-size:12px;">🗑</button></div>
                </div>
              </div>
              <!-- Service 6 -->
              <div class="card-elevated" style="border-color:var(--blue-600); position:relative;">
                <div class="badge badge-blue" style="position:absolute; top:-10px; right:12px;">✦ POPULAR</div>
                <div class="flex justify-between items-start mb-4 mt-2">
                  <div style="font-weight:600; font-size:16px; color:var(--ink);">Pako e Plotë</div>
                  <div style="font-size:20px; font-weight:700; color:var(--blue-600);">€25</div>
                </div>
                <p style="font-size:13px; color:var(--ink-3); margin-bottom:16px;">Prerje + mjekërr + larje + masazh në një takim.</p>
                <div class="flex justify-between items-center">
                  <div class="mono" style="font-size:12px; background:var(--surface-2); padding:4px 8px; border-radius:4px;">75 min</div>
                  <div class="flex gap-2"><button class="btn-icon" style="font-size:12px;">✎</button><button class="btn-icon text-danger" style="font-size:12px;">🗑</button></div>
                </div>
              </div>
            </div>"""
    
    html = html.replace('</div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <!-- Frame 5.4:', services_html + '\n          </div>\n        </div>\n      </div>\n\n      <!-- Frame 5.4:')

    # 10. Frame 6.1: Add Galeria, Orari, Kontakt, Footer
    site_extras = """
          <section class="site-section" style="background: var(--surface);">
            <h2 class="heading-2 text-center mb-12">Punët tona</h2>
            <div class="grid grid-cols-3 gap-4" style="max-width:1080px; margin:0 auto;">
              <div style="height:200px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border-radius:var(--r);"></div>
              <div style="height:200px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border-radius:var(--r);"></div>
              <div style="height:200px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border-radius:var(--r);"></div>
              <div style="height:200px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border-radius:var(--r);"></div>
              <div style="height:200px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border-radius:var(--r);"></div>
              <div style="height:200px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border-radius:var(--r);"></div>
            </div>
          </section>
          
          <section class="site-section">
            <div style="max-width:600px; margin:0 auto;">
              <h2 class="heading-2 text-center mb-8">Orari</h2>
              <div class="card-elevated" style="padding:0;">
                <div class="flex justify-between py-4 px-6 border-bottom" style="border-bottom:1px solid var(--border);"><span style="font-weight:500;">E Hënë</span><span class="mono">09:00 - 19:00</span></div>
                <div class="flex justify-between py-4 px-6 border-bottom" style="border-bottom:1px solid var(--border);"><span style="font-weight:500;">E Martë</span><span class="mono">09:00 - 19:00</span></div>
                <div class="flex justify-between py-4 px-6 border-bottom" style="border-bottom:1px solid var(--border);"><span style="font-weight:500;">E Mërkurë</span><span class="mono">09:00 - 19:00</span></div>
                <div class="flex justify-between py-4 px-6 border-bottom" style="border-bottom:1px solid var(--border);"><span style="font-weight:500;">E Enjte</span><span class="mono">09:00 - 19:00</span></div>
                <div class="flex justify-between py-4 px-6 border-bottom" style="border-bottom:1px solid var(--border);"><span style="font-weight:500;">E Premte</span><span class="mono">09:00 - 19:00</span></div>
                <div class="flex justify-between py-4 px-6 border-bottom" style="border-bottom:1px solid var(--border);"><span style="font-weight:500;">E Shtunë</span><span class="mono">09:00 - 16:00</span></div>
                <div class="flex justify-between py-4 px-6"><span style="font-weight:500; color:var(--ink-4);">E Diel</span><span class="mono" style="color:var(--ink-4); font-style:italic;">Mbyllur</span></div>
              </div>
            </div>
          </section>
          
          <section class="site-section" style="background: var(--surface);">
            <div class="grid grid-cols-2 gap-12" style="max-width:1080px; margin:0 auto;">
              <div>
                <h2 class="heading-2 mb-6">Na vizito.</h2>
                <div class="mb-4"><div class="eyebrow">ADRESA</div><p>Rr. Agim Ramadani, Prishtinë</p></div>
                <div class="mb-4"><div class="eyebrow">TELEFON</div><p>+383 44 123 456</p></div>
                <div><div class="eyebrow">INSTAGRAM</div><p>@arberschair</p></div>
              </div>
              <div style="background:var(--surface-3); border-radius:var(--r); min-height:280px; display:flex; align-items:center; justify-content:center; color:var(--ink-4);">[ Harta ]</div>
            </div>
          </section>
          
          <footer style="background:var(--ink); color:#fff; padding:40px 64px; text-align:center;">
            <div class="logo mb-4" style="color:#fff;">Arbër's Chair</div>
            <div class="mono" style="font-size:12px; color:var(--ink-4);">© 2026 · BËRË ME LOKALWEB</div>
          </footer>
"""
    html = html.replace('</section>\n        </div>\n      </div>\n\n      <!-- Frame 6.2:', site_extras + '        </div>\n      </div>\n\n      <!-- Frame 6.2:')

    # 11. Frame 1.2: Mobile Landing Full Stack
    mobile_landing_extras = """
          <section style="background: var(--surface-2); padding: 40px 24px; text-align: center;">
            <div class="mono mb-4" style="font-size: 11px; color: var(--ink-3);">PUNON PËR</div>
            <div class="flex justify-center flex-wrap gap-2">
              <span class="badge badge-neutral">Berbertari</span>
              <span class="badge badge-neutral">Sallone</span>
              <span class="badge badge-neutral">Palestra</span>
              <span class="badge badge-neutral">Klinika</span>
              <span class="badge badge-neutral">Restorante</span>
            </div>
          </section>
          
          <section class="py-20 px-6 text-center" style="padding: 40px 24px;">
            <h2 class="heading-2 mb-8">Si funksionon</h2>
            <div class="flex flex-col gap-4">
              <div class="card">
                <div class="mono badge-neutral mb-2">01</div>
                <h3 class="mb-1">Përshkruaj</h3>
                <p style="font-size:14px; color:var(--ink-3);">Trego çfarë bën biznesi yt.</p>
              </div>
              <div class="card">
                <div class="mono badge-blue mb-2">02</div>
                <h3 class="mb-1">Gjenero</h3>
                <p style="font-size:14px; color:var(--ink-3);">AI dizajnon faqen tënde.</p>
              </div>
              <div class="card">
                <div class="mono badge-success mb-2">03</div>
                <h3 class="mb-1">Lansoje</h3>
                <p style="font-size:14px; color:var(--ink-3);">Gati për rezervime.</p>
              </div>
            </div>
          </section>
          
          <section class="py-20 px-6" style="background: var(--paper); border-top: 1px solid var(--border); padding: 40px 24px;">
            <div class="text-center mb-8"><h2 class="heading-2">Çmimet</h2></div>
            <div class="flex flex-col gap-4">
              <div class="card text-center">
                <h3 class="mb-2">Faqe</h3>
                <div style="font-size:24px; font-weight:700; margin-bottom:16px;">€9<span style="font-size:14px; font-weight:400; color:var(--ink-3);">/muaj</span></div>
                <button class="btn btn-secondary w-full mb-4">Zgjidh Faqe</button>
              </div>
              <div class="card text-center" style="background: var(--ink); color: #fff; border-color: var(--ink); position: relative;">
                <div class="badge badge-blue" style="position:absolute; top:-12px; left:50%; transform:translateX(-50%);">MË E ZGJEDHURA</div>
                <h3 class="mb-2">Biznes</h3>
                <div style="font-size:24px; font-weight:700; margin-bottom:16px; color:var(--blue-400);">€19<span style="font-size:14px; font-weight:400; color:var(--ink-4);">/muaj</span></div>
                <button class="btn btn-primary w-full mb-4">Zgjidh Biznes</button>
              </div>
              <div class="card text-center">
                <h3 class="mb-2">Rritje</h3>
                <div style="font-size:24px; font-weight:700; margin-bottom:16px;">€39<span style="font-size:14px; font-weight:400; color:var(--ink-3);">/muaj</span></div>
                <button class="btn btn-secondary w-full mb-4">Zgjidh Rritje</button>
              </div>
            </div>
          </section>
          
          <section class="text-center" style="background: var(--ink); color: #fff; padding: 40px 24px;">
            <h2 class="display heavy mb-2" style="color: #fff; font-size:32px;">Filloje <span class="italic-accent text-blue" style="color:var(--blue-400);">sot.</span></h2>
            <p class="mb-6" style="color: var(--ink-4); font-size: 14px;">Gati në 12 sekonda.</p>
            <button class="btn btn-primary btn-lg w-full" onclick="goto('1.4')">Fillo falas</button>
          </section>
          
          <footer style="background: #fff; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; gap: 16px;">
            <div class="logo">LokalWeb</div>
            <div class="flex justify-center gap-6" style="font-size:13px;">
              <a href="#" class="text-ink-2">Kushtet</a>
              <a href="#" class="text-ink-2">Privatësia</a>
            </div>
            <div class="mono" style="font-size:11px; color:var(--ink-4);">© BËRË NË PRISHTINË</div>
          </footer>
"""
    html = html.replace('</section>\n        </main>\n      </div>\n\n      <!-- Frame 1.3:', '</section>\n' + mobile_landing_extras + '        </main>\n      </div>\n\n      <!-- Frame 1.3:')

    # 12. Frame 5.2: Add 4 booking rows
    new_bookings_rows = """
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:16px 24px; font-weight:500; color:var(--ink);">Mira Berisha</td>
                    <td style="padding:16px 24px;">Pako e Plotë</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">Nesër</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">09:30</td>
                    <td style="padding:16px 24px;"><span class="badge badge-success">KONFIRMUAR</span></td>
                    <td style="padding:16px 24px; text-align:right;"><button class="btn-icon" style="font-size:10px;">✓✓</button></td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:16px 24px; font-weight:500; color:var(--ink);">Edon Hoti</td>
                    <td style="padding:16px 24px;">Mjekërr Klasike</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">Nesër</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">11:00</td>
                    <td style="padding:16px 24px;"><span class="badge badge-warning">PRITET</span></td>
                    <td style="padding:16px 24px; text-align:right;">
                      <button class="btn-icon text-success" onclick="showToast('U pranua')">✓</button>
                      <button class="btn-icon text-danger" onclick="showToast('U refuzua')">✗</button>
                    </td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:16px 24px; font-weight:500; color:var(--ink);">Lirim Shala</td>
                    <td style="padding:16px 24px;">Fade & Mjekërr</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">E Mërkurë</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">14:00</td>
                    <td style="padding:16px 24px;"><span class="badge badge-success">KONFIRMUAR</span></td>
                    <td style="padding:16px 24px; text-align:right;"><button class="btn-icon" style="font-size:10px;">✓✓</button></td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:16px 24px; font-weight:500; color:var(--ink);">Endrit Mehmeti</td>
                    <td style="padding:16px 24px;">Prerje Klasike</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">E Mërkurë</td>
                    <td style="padding:16px 24px; font-family:'Geist Mono'; font-size:13px;">16:30</td>
                    <td style="padding:16px 24px;"><span class="badge badge-warning">PRITET</span></td>
                    <td style="padding:16px 24px; text-align:right;">
                      <button class="btn-icon text-success" onclick="showToast('U pranua')">✓</button>
                      <button class="btn-icon text-danger" onclick="showToast('U refuzua')">✗</button>
                    </td>
                  </tr>
"""
    html = html.replace('                  <tr style="border-bottom:1px solid var(--border); opacity:0.6;">', new_bookings_rows + '                  <tr style="border-bottom:1px solid var(--border); opacity:0.6;">')

    # 13. Frame 5.5: Add "Rreth nesh" gallery section
    rreth_nesh_html = """
            <div class="mb-12">
               <h3 class="mb-4">Rreth nesh</h3>
               <div class="grid grid-cols-4 gap-4">
                 <div style="border:2px dashed var(--border-2); border-radius:var(--r); height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background:var(--paper);">
                  <div style="font-size:20px; color:var(--blue-600);">+</div>
                 </div>
                 <div style="border-radius:var(--r); height:120px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border:1px solid var(--border);"></div>
                 <div style="border-radius:var(--r); height:120px; background:linear-gradient(to bottom right, var(--surface-2), var(--surface-3)); border:1px solid var(--border);"></div>
               </div>
            </div>
"""
    html = html.replace('            <div>\n               <h3 class="mb-4">Punët</h3>', rreth_nesh_html + '            <div>\n               <h3 class="mb-4">Punët</h3>')

    # 14. Frame 5.6: Canvas bigger
    # <div class="dash-main" style="padding:0; display:flex; flex-direction:column;"> is already set for 5.6!
    # I already did padding:0 in my original file. Let's make the editor wider: 360px
    html = html.replace('<div style="width:320px; background:var(--paper); border-right:1px solid var(--border); padding:24px;">', '<div style="width:360px; background:var(--paper); border-right:1px solid var(--border); padding:24px;">')

    with open('prototype.html', 'w', encoding='utf-8') as f:
        f.write(html)

if __name__ == '__main__':
    main()
