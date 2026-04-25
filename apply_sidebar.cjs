const fs = require('fs');

let html = fs.readFileSync('prototype.html', 'utf8');

// 1. Inject template right after <div class="shell-container">
const templateStr = `
  <template id="dashboard-sidebar">
    <div class="logo mb-6 px-3">LokalWeb</div>
    <div class="card mb-6" style="padding:12px; background:var(--blue-tint-08); border:none;">
      <div style="font-weight:600; font-size:14px; color:var(--ink);">Arbër's Chair</div>
      <div class="mono" style="font-size:11px; color:var(--blue-600);">arbers.lokalweb.com</div>
    </div>
    <div class="eyebrow px-3">MENAXHIMI</div>
    <div class="nav-item" data-id="5.1" onclick="goto('5.1')">Përmbledhje</div>
    <div class="nav-item" data-id="5.2" onclick="goto('5.2')">Rezervime <span class="badge badge-warning" style="margin-left:auto;">1</span></div>
    <div class="nav-item" data-id="5.3" onclick="goto('5.3')">Shërbime</div>
    <div class="nav-item" data-id="5.4" onclick="goto('5.4')">Orari</div>
    <div class="nav-item" data-id="5.5" onclick="goto('5.5')">Galeri</div>
    <div class="nav-item" data-id="5.7" onclick="goto('5.7')">Profili</div>
    <div class="eyebrow px-3 mt-6">DIZAJNI</div>
    <div class="nav-item" data-id="5.6" onclick="goto('5.6')">Personalizo</div>
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
  </template>
`;

if (!html.includes('id="dashboard-sidebar"')) {
  html = html.replace('<div class="shell-container">', '<div class="shell-container">\n' + templateStr);
}

// 2. Replace all <div class="dash-sidebar">...</div> with <div class="dash-sidebar" data-sidebar-target="X"></div>
const frameRegex = /<div class="frame" data-frame="([\d\.]+)"[\s\S]*?<div class="dash-sidebar">([\s\S]*?)<\/div>\s*(?:<!--\s*Main\s*-->\s*)?<div class="dash-main/g;

html = html.replace(frameRegex, (match, frameId, sidebarContent) => {
    return match.replace(
        '<div class="dash-sidebar">' + sidebarContent + '</div>',
        '<div class="dash-sidebar" data-sidebar-target="' + frameId + '"></div>'
    );
});

// 3. Update the script block to populate the sidebar if missing
if (!html.includes('populateSidebar')) {
    const scriptInsert = `
    // Inject Sidebar
    function populateSidebar(frameEl, frameId) {
      const sidebar = frameEl.querySelector('.dash-sidebar[data-sidebar-target]');
      if (sidebar) {
        const tmpl = document.getElementById('dashboard-sidebar');
        if (tmpl) {
          sidebar.innerHTML = tmpl.innerHTML;
          const items = sidebar.querySelectorAll('.nav-item');
          items.forEach(item => {
            if (item.getAttribute('data-id') === frameId) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });
        }
      }
    }
`;
    
    // Inject populateSidebar into script block
    html = html.replace('function goto(frameId) {', scriptInsert + '\n    function goto(frameId) {');
    
    // Call populateSidebar inside goto() loop where mode is matched
    html = html.replace('if (f.id === frameId) {', 'if (f.id === frameId) {\n            populateSidebar(frameEl, frameId);');
}

fs.writeFileSync('prototype.html', html, 'utf8');
console.log("Sidebar fix applied.");
