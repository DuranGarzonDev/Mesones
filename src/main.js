import './styles.css';
import { createIcons, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, CircleUserRound, FileText, GraduationCap, HeartHandshake, Image, Landmark, LogIn, LogOut, Mail, MapPin, Menu, Newspaper, Phone, Quote, Send, ShieldCheck, Sparkles, Sprout, Upload, Users, X } from 'lucide';
import { categories, school } from './config.js';
import { getCurrentEditor, listOwnArticles, listPublishedNews, publishArticle, requestPasswordReset, signIn, signOut, updateArticle, updatePassword } from './services/news.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';

const icons = { ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, CircleUserRound, FileText, GraduationCap, HeartHandshake, Image, Landmark, LogIn, LogOut, Mail, MapPin, Menu, Newspaper, Phone, Quote, Send, ShieldCheck, Sparkles, Sprout, Upload, Users, X };
let articles = [];
let activeCategory = 'todas';
let currentEditor = null;
let ownedArticles = [];
let editorView = 'create';
let editingArticleId = null;
let lockedScrollY = null;
let manageLoading = false;
let manageError = false;
const initialAuthType = new URLSearchParams(window.location.hash.slice(1)).get('type')
  || new URLSearchParams(window.location.search).get('type');
let passwordSetupRequired = initialAuthType === 'invite' || initialAuthType === 'recovery';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
const webColegiosLink = (() => {
  try {
    const url = new URL(school.webColegiosUrl);
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
})();
const formatDate = (value) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
const icon = (name, size = 20) => `<i data-lucide="${name}" width="${size}" height="${size}" aria-hidden="true"></i>`;

document.querySelector('#app').innerHTML = `
  <header class="site-header" id="inicio">
    <div class="utility-bar">
      <div class="container utility-inner">
        <span>${icon('map-pin', 15)} ${school.location}</span>
        <a href="mailto:${school.email}">${icon('mail', 15)} ${school.email}</a>
      </div>
    </div>
    <nav class="nav container" aria-label="Navegación principal">
      <a class="brand" href="#inicio" aria-label="Inicio — ${school.name}">
        <img src="./assets/logo.png" alt="Escudo de la Institución Educativa Rural Los Mesones" />
        <span><strong>Los Mesones</strong><small>Institución Educativa Rural</small></span>
      </a>
      <button class="icon-button mobile-menu-button" id="menuButton" aria-label="Abrir menú" aria-expanded="false">${icon('menu')}</button>
      <div class="nav-links" id="navLinks">
        <a href="#inicio">Inicio</a><a href="#noticias">Noticias</a><a href="#institucion">Institución</a><a href="#servicios">Servicios</a>
        <div class="editor-nav">
          <button class="button button-small button-outline" id="editorButton">${icon('log-in', 17)} Acceso editorial</button>
          <div class="profile-controls" id="profileControls" hidden>
            <button class="button button-small button-outline" id="createNewsButton">${icon('newspaper', 17)} Crear noticia</button>
            <div class="profile-menu-wrap">
              <button class="profile-trigger" id="profileButton" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Opciones del perfil editorial">
                <span class="profile-avatar">${icon('circle-user-round', 22)}</span>${icon('chevron-down', 17)}
              </button>
              <div class="profile-menu" id="profileMenu" role="menu" hidden>
                <p id="profileName"></p>
                <button role="menuitem" data-editor-view="create">${icon('newspaper', 16)} Crear noticia</button>
                <button role="menuitem" data-editor-view="manage">${icon('file-text', 16)} Editar y ver borradores</button>
                <button role="menuitem" id="logoutButton">${icon('log-out', 16)} Cerrar sesión</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  </header>

  <main id="contenido">
    <section class="hero">
      <div class="hero-media" role="img" aria-label="Estudiantes de la Institución Educativa Rural Los Mesones"></div>
      <div class="hero-overlay"></div>
      <div class="container hero-content">
        <p class="eyebrow light">${icon('sprout', 18)} Educación rural con propósito</p>
        <h1>Aprender desde el territorio.<br /><em>Crecer para transformarlo.</em></h1>
        <p class="hero-lead">Formamos personas íntegras, críticas y comprometidas con su comunidad, conectando el aprendizaje con la vida rural.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#noticias">Ver noticias ${icon('arrow-right', 18)}</a>
          <a class="button button-ghost" href="#institucion">Conocer la institución</a>
        </div>
      </div>
      <div class="hero-seal"><img src="./assets/logo.png" alt="" /></div>
    </section>

    <section class="identity-strip" aria-label="Información destacada">
      <div class="container identity-grid">
        <div><span>${icon('graduation-cap')}</span><p><strong>Formación integral</strong><small>Preescolar, básica y media</small></p></div>
        <div><span>${icon('sprout')}</span><p><strong>Vocación rural</strong><small>Aprendizaje con contexto</small></p></div>
        <div><span>${icon('map-pin')}</span><p><strong>Territorio</strong><small>Teorama, Norte de Santander</small></p></div>
        <div><span>${icon('users')}</span><p><strong>Comunidad</strong><small>Familias, docentes y estudiantes</small></p></div>
      </div>
    </section>

    <section class="section news-section" id="noticias">
      <div class="container">
        <div class="section-heading split">
          <div><p class="eyebrow">${icon('newspaper', 18)} Actualidad institucional</p><h2>Historias que construyen <em>comunidad</em></h2></div>
          <p>Conoce las actividades, logros y acontecimientos de nuestra institución.</p>
        </div>
        <div class="filters" id="newsFilters" aria-label="Filtrar noticias">
          <button class="filter active" data-category="todas">Todas</button>
          ${categories.map((category) => `<button class="filter" data-category="${category.value}">${category.label}</button>`).join('')}
        </div>
        <div class="news-grid" id="newsGrid"><div class="loading">Cargando noticias…</div></div>
      </div>
    </section>

    <section class="section institution-section" id="institucion">
      <div class="container institution-grid">
        <div class="institution-copy">
          <p class="eyebrow">${icon('landmark', 18)} Nuestra identidad</p>
          <h2>Una escuela conectada con su <em>entorno</em></h2>
          <p>La Institución Educativa Rural Los Mesones ofrece educación formal en los niveles de preescolar, básica y media. Su propuesta busca responder a las necesidades del territorio y preparar a los estudiantes para la vida, el trabajo y la continuidad de sus estudios.</p>
          <blockquote>${icon('quote', 28)}<p>Educación de calidad, incluyente y pertinente para cada estudiante de nuestra comunidad rural.</p></blockquote>
        </div>
        <div class="purpose-cards">
          <article class="purpose-card"><span>01</span>${icon('book-open', 27)}<h3>Aprendizaje significativo</h3><p>Los saberes escolares se relacionan con experiencias reales del entorno.</p></article>
          <article class="purpose-card featured"><span>02</span>${icon('heart-handshake', 27)}<h3>Formación integral</h3><p>Valores, pensamiento crítico, convivencia y sentido de pertenencia.</p></article>
          <article class="purpose-card"><span>03</span>${icon('sparkles', 27)}<h3>Innovación pertinente</h3><p>Herramientas y prácticas que fortalecen las oportunidades del campo.</p></article>
        </div>
      </div>
    </section>

    <section class="section values-section">
      <div class="container values-grid">
        <div><p class="eyebrow light">Principios institucionales</p><h2>Valores para aprender,<br /><em>convivir y servir</em></h2></div>
        <div class="value-list">
          <span><b>01</b> Respeto</span><span><b>02</b> Responsabilidad</span><span><b>03</b> Solidaridad</span><span><b>04</b> Honestidad</span><span><b>05</b> Excelencia</span><span><b>06</b> Cuidado del entorno</span>
        </div>
      </div>
    </section>

    <section class="section services-section" id="servicios">
      <div class="container">
        <div class="section-heading"><p class="eyebrow">${icon('file-text', 18)} Atención a la comunidad</p><h2>Información y <em>servicios</em></h2></div>
        <div class="services-grid">
          <article class="service-card"><span>${icon('graduation-cap', 26)}</span><h3>Matrículas</h3><p>Consulta directamente con la institución los requisitos, fechas y disponibilidad de cupos.</p><a href="mailto:${school.email}?subject=Consulta%20sobre%20matr%C3%ADculas">Solicitar información ${icon('arrow-right', 16)}</a></article>
          <article class="service-card"><span>${icon('file-text', 26)}</span><h3>Certificados</h3><p>Solicita certificados de estudio, constancias de matrícula y documentos académicos.</p><a href="mailto:${school.email}?subject=Solicitud%20de%20certificado">Iniciar solicitud ${icon('arrow-right', 16)}</a></article>
          <article class="service-card"><span>${icon('mail', 26)}</span><h3>PQRS</h3><p>Envía peticiones, quejas, reclamos, sugerencias o felicitaciones al correo institucional.</p><a href="mailto:${school.email}?subject=PQRS">Enviar PQRS ${icon('arrow-right', 16)}</a></article>
          <article class="service-card"><span>${icon('calendar-days', 26)}</span><h3>Calendario escolar</h3><p>Revisa las noticias institucionales para conocer fechas y actividades académicas.</p><a href="#noticias">Consultar novedades ${icon('arrow-right', 16)}</a></article>
        </div>
        <div class="webcolegios-card">
          <span class="webcolegios-icon">${icon('graduation-cap', 28)}</span>
          <div><p class="eyebrow">Plataforma académica</p><h3>Acceso a WebColegios</h3><p>Consulta la información académica de la institución en WebColegios. El enlace oficial estará disponible próximamente.</p></div>
          ${webColegiosLink ? `<a class="button button-outline" href="${escapeHtml(webColegiosLink)}" target="_blank" rel="noopener noreferrer">Ir a WebColegios ${icon('arrow-right', 17)}</a>` : '<button class="button button-outline" type="button" disabled>Enlace próximamente</button>'}
        </div>
      </div>
    </section>

    <section class="contact-banner">
      <div class="container contact-inner"><div><p class="eyebrow light">Estamos para orientarte</p><h2>¿Necesitas comunicarte con la institución?</h2></div><a class="button button-light" href="mailto:${school.email}">${icon('send', 18)} Escribir al colegio</a></div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer-grid">
      <div class="footer-brand"><img src="./assets/logo.png" alt="Escudo de ${school.shortName}" /><div><strong>${school.name}</strong><p>Educación rural con calidad, inclusión y compromiso social.</p></div></div>
      <div><h3>Contacto</h3><a href="mailto:${school.email}">${school.email}</a><a href="tel:+573176184560">+57 ${school.phone}</a><span>${school.address}</span></div>
      <div><h3>Navegación</h3><a href="#noticias">Noticias</a><a href="#institucion">Institución</a><a href="#servicios">Servicios</a></div>
    </div>
    <div class="container footer-bottom"><span>© ${new Date().getFullYear()} ${school.shortName}</span><span>${school.location}, Colombia</span></div>
  </footer>

  <dialog class="modal article-modal" id="articleModal"><button class="modal-close" data-close="articleModal" aria-label="Cerrar">${icon('x')}</button><div id="articleDetail"></div></dialog>
  <dialog class="modal editor-modal" id="editorModal"><button class="modal-close" data-close="editorModal" aria-label="Cerrar">${icon('x')}</button><div id="editorContent"></div></dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

createIcons({ icons });

function toast(message, type = 'info') {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.className = `toast show ${type}`;
  window.setTimeout(() => { element.className = 'toast'; }, 4200);
}

function openDialog(dialog) {
  if (dialog.open) return;
  if (lockedScrollY === null) {
    lockedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = '100%';
  }
  dialog.showModal();
}

function unlockPage() {
  if (document.querySelector('dialog[open]') || lockedScrollY === null) return;
  const previousScrollY = lockedScrollY;
  lockedScrollY = null;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, previousScrollY);
}

function closeProfileMenu() {
  document.querySelector('#profileMenu').hidden = true;
  document.querySelector('#profileButton').setAttribute('aria-expanded', 'false');
}

function renderAuthNavigation() {
  const authenticated = Boolean(currentEditor && !passwordSetupRequired);
  document.querySelector('#editorButton').hidden = authenticated;
  document.querySelector('#profileControls').hidden = !authenticated;
  document.querySelector('#profileName').textContent = authenticated
    ? currentEditor.profile.display_name : '';
  if (!authenticated) closeProfileMenu();
}

function closeMobileMenu() {
  document.querySelector('#navLinks').classList.remove('open');
  const button = document.querySelector('#menuButton');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = icon('menu');
  createIcons({ icons });
}

async function openEditor(view = 'create') {
  closeProfileMenu();
  closeMobileMenu();
  currentEditor = await getCurrentEditor();
  renderAuthNavigation();
  editorView = currentEditor && view === 'manage' ? 'manage' : 'create';
  editingArticleId = null;
  manageLoading = editorView === 'manage';
  manageError = false;
  renderEditor();
  openDialog(document.querySelector('#editorModal'));
  if (manageLoading) {
    try { ownedArticles = await listOwnArticles(currentEditor); }
    catch { manageError = true; ownedArticles = []; }
    finally { manageLoading = false; renderEditor(); }
  }
}

function categoryLabel(value) {
  return categories.find((category) => category.value === value)?.label || 'Institucional';
}

function renderNews() {
  const filtered = activeCategory === 'todas' ? articles : articles.filter((article) => article.category === activeCategory);
  const grid = document.querySelector('#newsGrid');
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state">No hay noticias publicadas en esta categoría.</div>';
    return;
  }
  grid.innerHTML = filtered.map((article, index) => `
    <article class="news-card ${index === 0 ? 'news-card-featured' : ''}">
      <button class="news-card-click" data-article="${escapeHtml(article.id)}" aria-label="Leer ${escapeHtml(article.title)}"></button>
      <div class="news-image">${article.image_url ? `<img src="${escapeHtml(article.image_url)}" alt="" loading="lazy" />` : `<div class="image-placeholder">${icon('image', 32)}</div>`}<span>${escapeHtml(categoryLabel(article.category))}</span></div>
      <div class="news-body"><time datetime="${escapeHtml(article.published_at)}">${formatDate(article.published_at)}</time><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.excerpt)}</p><b>Leer noticia ${icon('arrow-right', 16)}</b></div>
    </article>
  `).join('');
  createIcons({ icons });
}

function openArticle(id) {
  const article = articles.find((item) => String(item.id) === String(id));
  if (!article) return;
  document.querySelector('#articleDetail').innerHTML = `
    ${article.image_url ? `<img class="article-cover" src="${escapeHtml(article.image_url)}" alt="" />` : ''}
    <div class="article-content"><span class="article-category">${escapeHtml(categoryLabel(article.category))}</span><h2>${escapeHtml(article.title)}</h2><div class="article-meta">${formatDate(article.published_at)} · ${escapeHtml(article.author_name)}</div><p class="article-lead">${escapeHtml(article.excerpt)}</p><div class="article-text">${escapeHtml(article.content).replace(/\n/g, '<br />')}</div></div>`;
  openDialog(document.querySelector('#articleModal'));
}

function renderArticleForm(article = null) {
  const selectedStatus = article?.status || 'published';
  const title = article ? 'Editar noticia' : 'Nueva noticia';
  return `<div class="editor-head"><div><p class="eyebrow">Panel editorial</p><h2>${title}</h2><p>Sesión de ${escapeHtml(currentEditor.profile.display_name)}</p></div>${article ? `<button class="button button-small button-outline" type="button" id="backToArticles">${icon('arrow-right', 17)} Volver al listado</button>` : ''}</div>
    <form id="articleForm" class="form">
      <div class="form-row"><label>Título<input name="title" maxlength="120" minlength="8" value="${escapeHtml(article?.title || '')}" required /></label><label>Categoría<select name="category" required>${categories.map((category) => `<option value="${category.value}" ${article?.category === category.value ? 'selected' : ''}>${category.label}</option>`).join('')}</select></label></div>
      <label>Resumen<textarea name="excerpt" rows="2" minlength="20" maxlength="240" required>${escapeHtml(article?.excerpt || '')}</textarea></label>
      <label>Contenido<textarea name="content" rows="8" minlength="30" maxlength="30000" required>${escapeHtml(article?.content || '')}</textarea></label>
      ${article?.image_url ? `<div class="current-image"><img src="${escapeHtml(article.image_url)}" alt="Portada actual" /><span>Portada actual · elige otra imagen solo si deseas reemplazarla.</span></div>` : ''}
      <label class="upload-field">${icon('upload')}<span><strong>${article ? 'Reemplazar portada (opcional)' : 'Imagen de portada'}</strong><small>JPG, PNG o WebP · máximo 8 MB</small></span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      <div class="form-actions"><label>Estado<select name="status"><option value="published" ${selectedStatus === 'published' ? 'selected' : ''}>Publicar ahora</option><option value="draft" ${selectedStatus === 'draft' ? 'selected' : ''}>Guardar borrador</option></select></label><button class="button button-primary" type="submit">${icon('send', 18)} ${article ? 'Guardar cambios' : 'Guardar noticia'}</button></div>
      <p class="form-error" id="articleError"></p>
    </form>`;
}

function renderArticleManager() {
  const entries = manageLoading ? '<div class="editor-empty">Cargando tus noticias…</div>'
    : manageError ? '<div class="editor-empty">No fue posible cargar tus noticias. Intenta nuevamente.</div>'
      : ownedArticles.length ? ownedArticles.map((article) => `<article class="managed-article"><div><span class="article-status ${article.status}">${article.status === 'draft' ? 'Borrador' : 'Publicada'}</span><h3>${escapeHtml(article.title)}</h3><p>Actualizada: ${formatDate(article.updated_at)}</p></div><button class="button button-small button-outline" type="button" data-edit-article="${escapeHtml(article.id)}">Editar ${icon('arrow-right', 16)}</button></article>`).join('')
        : '<div class="editor-empty">Aún no tienes noticias ni borradores guardados.</div>';
  return `<div class="editor-head"><div><p class="eyebrow">Panel editorial</p><h2>Editar y ver borradores</h2><p>Solo aparecen las noticias creadas por tu cuenta.</p></div><button class="button button-small button-outline" type="button" id="newArticleFromManager">${icon('newspaper', 17)} Crear noticia</button></div><div class="managed-list">${entries}</div>`;
}

function renderEditor() {
  const container = document.querySelector('#editorContent');
  if (!isSupabaseConfigured) {
    container.innerHTML = `<div class="modal-header"><span class="modal-icon">${icon('shield-check')}</span><p class="eyebrow">Configuración pendiente</p><h2>Activa el módulo editorial</h2><p>El portal está listo. Configura las variables públicas de Supabase y ejecuta la migración incluida para habilitar el acceso seguro.</p></div><div class="setup-note"><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></div>`;
  } else if (passwordSetupRequired && currentEditor) {
    container.innerHTML = `<div class="modal-header"><span class="modal-icon">${icon('shield-check')}</span><p class="eyebrow">Activación segura</p><h2>Define tu contraseña</h2><p>Crea la contraseña que usarás para ingresar al panel editorial.</p></div><form id="passwordForm" class="form"><label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="10" required /></label><label>Confirmar contraseña<input name="confirmation" type="password" autocomplete="new-password" minlength="10" required /></label><p class="form-help">Usa al menos 10 caracteres y evita contraseñas reutilizadas.</p><p class="form-error" id="passwordError"></p><button class="button button-primary" type="submit">Guardar contraseña ${icon('arrow-right', 18)}</button></form>`;
  } else if (!currentEditor) {
    container.innerHTML = `<div class="modal-header"><span class="modal-icon">${icon('log-in')}</span><p class="eyebrow">Área restringida</p><h2>Acceso editorial</h2><p>Ingresa con una cuenta autorizada por la institución.</p></div><form id="loginForm" class="form"><label>Correo institucional<input name="email" type="email" autocomplete="username" required /></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="8" required /></label><p class="form-error" id="loginError"></p><button class="button button-primary" type="submit">Ingresar ${icon('arrow-right', 18)}</button><button class="text-button" id="resetPasswordButton" type="button">¿Olvidaste tu contraseña?</button></form>`;
  } else {
    container.innerHTML = editorView === 'manage' ? renderArticleManager()
      : renderArticleForm(editingArticleId ? ownedArticles.find((article) => article.id === editingArticleId) : null);
  }
  createIcons({ icons });
}

document.addEventListener('click', async (event) => {
  const target = event.target;
  const articleButton = target.closest('[data-article]');
  if (articleButton) openArticle(articleButton.dataset.article);

  const filter = target.closest('[data-category]');
  if (filter) {
    activeCategory = filter.dataset.category;
    document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === filter));
    renderNews();
  }

  const closeButton = target.closest('[data-close]');
  if (closeButton) document.querySelector(`#${closeButton.dataset.close}`).close();

  if (target.closest('#editorButton') || target.closest('#createNewsButton')) {
    await openEditor('create');
  }

  if (target.closest('#profileButton')) {
    const profileMenu = document.querySelector('#profileMenu');
    profileMenu.hidden = !profileMenu.hidden;
    document.querySelector('#profileButton').setAttribute('aria-expanded', String(!profileMenu.hidden));
  } else if (!target.closest('#profileMenu')) {
    closeProfileMenu();
  }

  const viewButton = target.closest('[data-editor-view]');
  if (viewButton) await openEditor(viewButton.dataset.editorView);

  const editButton = target.closest('[data-edit-article]');
  if (editButton) {
    const article = ownedArticles.find((item) => item.id === editButton.dataset.editArticle);
    if (!article) return;
    editingArticleId = article.id;
    editorView = 'edit';
    renderEditor();
    document.querySelector('#editorModal').scrollTop = 0;
  }

  if (target.closest('#backToArticles')) {
    editingArticleId = null;
    editorView = 'manage';
    renderEditor();
  }

  if (target.closest('#newArticleFromManager')) {
    editingArticleId = null;
    editorView = 'create';
    renderEditor();
  }

  if (target.closest('#logoutButton')) {
    closeProfileMenu();
    await signOut(); currentEditor = null; ownedArticles = []; editingArticleId = null;
    renderAuthNavigation();
    if (document.querySelector('#editorModal').open) renderEditor();
    toast('Sesión cerrada correctamente.');
  }

  if (target.closest('#resetPasswordButton')) {
    const form = document.querySelector('#loginForm');
    const email = form?.elements.email.value.trim();
    const error = form?.querySelector('#loginError');
    if (!email) {
      error.textContent = 'Escribe primero el correo de tu cuenta.';
      form?.elements.email.focus();
      return;
    }
    const button = target.closest('#resetPasswordButton');
    button.disabled = true;
    error.textContent = '';
    try {
      await requestPasswordReset(email);
      toast('Revisa tu correo para restablecer la contraseña.', 'success');
    } catch {
      error.textContent = 'No se pudo enviar el enlace. Verifica el correo e intenta nuevamente.';
    } finally {
      button.disabled = false;
    }
  }
});

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'loginForm') {
    event.preventDefault();
    const form = event.target; const button = form.querySelector('button'); const error = form.querySelector('#loginError');
    button.disabled = true; button.textContent = 'Verificando…'; error.textContent = '';
    try { const values = new FormData(form); currentEditor = await signIn(values.get('email'), values.get('password')); renderAuthNavigation(); renderEditor(); toast('Acceso concedido.', 'success'); }
    catch { error.textContent = 'No fue posible iniciar sesión. Verifica tus datos y permisos.'; button.disabled = false; button.innerHTML = `Ingresar ${icon('arrow-right', 18)}`; createIcons({ icons }); }
  }

  if (event.target.id === 'passwordForm') {
    event.preventDefault();
    const form = event.target; const button = form.querySelector('button'); const error = form.querySelector('#passwordError'); const values = new FormData(form);
    const password = values.get('password');
    error.textContent = '';
    if (password !== values.get('confirmation')) {
      error.textContent = 'Las contraseñas no coinciden.';
      return;
    }
    button.disabled = true; button.textContent = 'Guardando…';
    try {
      await updatePassword(password);
      passwordSetupRequired = false;
      window.history.replaceState({}, document.title, window.location.pathname);
      renderAuthNavigation();
      renderEditor();
      toast('Contraseña guardada. Tu cuenta está activa.', 'success');
    } catch {
      error.textContent = 'No se pudo guardar la contraseña. Solicita un enlace nuevo e intenta otra vez.';
      button.disabled = false; button.innerHTML = `Guardar contraseña ${icon('arrow-right', 18)}`; createIcons({ icons });
    }
  }

  if (event.target.id === 'articleForm') {
    event.preventDefault();
    const form = event.target; const button = form.querySelector('button[type="submit"]'); const error = form.querySelector('#articleError'); const values = new FormData(form);
    button.disabled = true; button.textContent = 'Guardando…'; error.textContent = '';
    try {
      const changes = { title: values.get('title').trim(), excerpt: values.get('excerpt').trim(), content: values.get('content').trim(), category: values.get('category'), status: values.get('status') };
      const image = values.get('image')?.size ? values.get('image') : null;
      if (editingArticleId) {
        const previousArticle = ownedArticles.find((article) => article.id === editingArticleId);
        if (!previousArticle) throw new Error('La noticia no está disponible.');
        await updateArticle(editingArticleId, changes, image, currentEditor, previousArticle);
        editingArticleId = null;
        editorView = 'manage';
        try { ownedArticles = await listOwnArticles(currentEditor); manageError = false; }
        catch { ownedArticles = []; manageError = true; }
        renderEditor();
      } else {
        await publishArticle(changes, image, currentEditor);
        form.reset();
      }
      let feedRefreshFailed = false;
      try { articles = await listPublishedNews(); renderNews(); }
      catch { feedRefreshFailed = true; }
      toast(`${changes.status === 'published' ? 'Noticia publicada.' : 'Borrador guardado.'}${feedRefreshFailed ? ' Recarga la página para actualizar la lista.' : ''}`, 'success');
    } catch { error.textContent = 'No se pudo guardar la noticia. Revisa los datos o los permisos de la cuenta.'; }
    finally { if (button.isConnected) { button.disabled = false; button.innerHTML = `${icon('send', 18)} ${editingArticleId ? 'Guardar cambios' : 'Guardar noticia'}`; createIcons({ icons }); } }
  }
});

const menuButton = document.querySelector('#menuButton');
menuButton.addEventListener('click', () => {
  const open = document.querySelector('#navLinks').classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.innerHTML = icon(open ? 'x' : 'menu'); createIcons({ icons });
});
document.querySelectorAll('#navLinks a').forEach((link) => link.addEventListener('click', closeMobileMenu));
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', unlockPage);
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeProfileMenu(); });

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') passwordSetupRequired = true;
    if (!['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(event)) return;
    window.setTimeout(async () => {
      currentEditor = await getCurrentEditor();
      renderAuthNavigation();
      if (passwordSetupRequired || document.querySelector('#editorModal').open) renderEditor();
      const modal = document.querySelector('#editorModal');
      if (passwordSetupRequired && currentEditor && !modal.open) openDialog(modal);
    }, 0);
  });
}

try { articles = await listPublishedNews(); renderNews(); }
catch { document.querySelector('#newsGrid').innerHTML = '<div class="empty-state">No fue posible cargar las noticias. Intenta nuevamente más tarde.</div>'; }
