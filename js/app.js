// ==========================================================
// Movie Prime — shared frontend logic (home + category pages)
// ==========================================================

{
  const supabase = window.supabaseClient;

  // Global lists to store movies for real-time search filtering
  let allTrendingMovies = [];
  let allLatestMovies = [];
  let allCategoryMovies = [];

  // ---------- language toggle (English / Sinhala) ----------
  function applyLang(lang){
    document.querySelectorAll('[data-en]').forEach(el=>{
      el.textContent = lang === 'si' ? (el.dataset.si || el.dataset.en) : el.dataset.en;
    });
    
    // Set placeholders for search inputs
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.placeholder = lang === 'si'
        ? (searchInput.dataset.siPlaceholder || 'සොයන්න...')
        : (searchInput.dataset.enPlaceholder || 'Search movies...');
    }

    document.querySelectorAll('.lang-toggle button').forEach(b=>{
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    localStorage.setItem('mp_lang', lang);
  }

  function initLangToggle(){
    const saved = localStorage.getItem('mp_lang') || 'en';
    applyLang(saved);
    document.querySelectorAll('.lang-toggle button').forEach(b=>{
      b.addEventListener('click', ()=> applyLang(b.dataset.lang));
    });
  }

  // ---------- card rendering ----------
  function movieCardHTML(m){
    const poster = m.poster_url || driveLinkToImageUrl(m.drive_link) || '';
    return `
      <a class="card" href="movie.html?id=${m.id}">
        <div class="poster-wrap">
          ${m.trending ? '<span class="badge trending">Trending</span>' : ''}
          <img src="${poster}" alt="${escapeHtml(m.title)}" loading="lazy"
               onload="this.classList.add('loaded')"
               onerror="this.style.opacity=0.15">
        </div>
        <div class="card-body">
          <p class="title">${escapeHtml(m.title)}</p>
          <div class="meta">
            <span>${m.year || ''}</span>
            ${m.rating ? `<span class="rating">★ ${m.rating}</span>` : ''}
          </div>
        </div>
      </a>`;
  }

  // ---------- dynamic hero banner ----------
  async function renderHeroBanner() {
    const heroContainer = document.getElementById('heroBanner');
    if (!heroContainer) return;
    
    // Try to use the top trending movie as featured, otherwise fall back to latest, otherwise static default
    let featured = null;
    if (allTrendingMovies.length > 0) {
      featured = allTrendingMovies[0];
    } else if (allLatestMovies.length > 0) {
      featured = allLatestMovies[0];
    }
    
    if (!featured) return; // Keep static placeholder defined in HTML
    
    const poster = featured.poster_url || driveLinkToImageUrl(featured.drive_link) || '';
    const lang = localStorage.getItem('mp_lang') || 'en';
    const watchNowText = lang === 'si' ? 'දැන් නරඹන්න' : 'Watch Now';
    const featuredText = lang === 'si' ? 'විශේෂාංගය' : 'Featured Film';
    const ratingText = featured.rating ? `★ ${featured.rating}` : '';
    
    heroContainer.innerHTML = `
      <section class="hero-banner" style="background-image: url('${poster}')">
        <div class="hero-banner-content">
          <p class="eyebrow" data-en="Featured Film" data-si="විශේෂාංගය">${featuredText}</p>
          <h1 class="display">${escapeHtml(featured.title)}</h1>
          <div class="meta">
            <span>${featured.year || ''}</span>
            ${featured.rating ? `<span class="rating">${ratingText}</span>` : ''}
            <span class="category-tag">${escapeHtml(featured.category)}</span>
          </div>
          <p class="desc">${escapeHtml(featured.description || '')}</p>
          <a href="movie.html?id=${featured.id}" class="btn">${watchNowText}</a>
        </div>
      </section>
    `;
  }

  // ---------- scroll-reveal for section headers ----------
  function initScrollReveal(){
    const targets = document.querySelectorAll('.section-head');
    targets.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:.2});
    targets.forEach(el => io.observe(el));
  }

  function escapeHtml(s){
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ---------- data fetchers ----------
  async function fetchTrending(limit=10){
    const {data,error} = await supabase.from('movies')
      .select('*').eq('trending', true)
      .order('created_at', {ascending:false}).limit(limit);
    if(error){console.error(error); return [];}
    return data;
  }

  async function fetchLatest(limit=12){
    const {data,error} = await supabase.from('movies')
      .select('*').order('created_at', {ascending:false}).limit(limit);
    if(error){console.error(error); return [];}
    return data;
  }

  async function fetchByCategory(category, limit=60){
    let q = supabase.from('movies').select('*').order('created_at', {ascending:false}).limit(limit);
    if(category && category !== 'All') q = q.eq('category', category);
    const {data,error} = await q;
    if(error){console.error(error); return [];}
    return data;
  }

  async function fetchCategories(){
    const {data,error} = await supabase.from('movies').select('category');
    if(error){console.error(error); return [];}
    return [...new Set(data.map(d=>d.category).filter(Boolean))];
  }

  // ---------- search filtering ----------
  function filterMovies(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    const filterList = (list, gridEl, emptyMsg) => {
      if (!gridEl) return;
      const filtered = list.filter(m => 
        m.title.toLowerCase().includes(cleanQuery) || 
        (m.description && m.description.toLowerCase().includes(cleanQuery)) ||
        (m.category && m.category.toLowerCase().includes(cleanQuery))
      );
      gridEl.innerHTML = filtered.length
        ? filtered.map(movieCardHTML).join('')
        : `<p style="color:var(--muted)">${emptyMsg}</p>`;
    };

    const lang = localStorage.getItem('mp_lang') || 'en';
    const emptyMsg = lang === 'si' ? 'ගැලපෙන චිත්‍රපට කිසිවක් හමු නොවීය.' : 'No matching movies found.';

    filterList(allTrendingMovies, document.getElementById('trendingGrid'), emptyMsg);
    filterList(allLatestMovies, document.getElementById('latestGrid'), emptyMsg);
    filterList(allCategoryMovies, document.getElementById('categoryGrid'), emptyMsg);
  }

  // ---------- home page ----------
  async function renderHome(){
    const trendingEl = document.getElementById('trendingGrid');
    const latestEl = document.getElementById('latestGrid');
    
    if(trendingEl){
      allTrendingMovies = await fetchTrending();
      trendingEl.innerHTML = allTrendingMovies.length
        ? allTrendingMovies.map(movieCardHTML).join('')
        : `<p style="color:var(--muted)">No trending movies yet — add some from the admin panel.</p>`;
    }
    if(latestEl){
      allLatestMovies = await fetchLatest();
      latestEl.innerHTML = allLatestMovies.length
        ? allLatestMovies.map(movieCardHTML).join('')
        : `<p style="color:var(--muted)">No movies added yet.</p>`;
    }
    
    await renderHeroBanner();
  }

  // ---------- category page ----------
  async function renderCategoryPage(){
    const chipsEl = document.getElementById('categoryChips');
    const gridEl = document.getElementById('categoryGrid');
    if(!chipsEl || !gridEl) return;

    const params = new URLSearchParams(location.search);
    let active = params.get('c') || 'All';

    const cats = ['All', ...await fetchCategories()];
    chipsEl.innerHTML = cats.map(c =>
      `<button class="chip ${c===active?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join('');

    async function load(cat){
      active = cat;
      chipsEl.querySelectorAll('.chip').forEach(ch=>{
        ch.classList.toggle('active', ch.dataset.cat === cat);
      });
      allCategoryMovies = await fetchByCategory(cat);
      
      // Reset search bar when changing categories
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';

      gridEl.innerHTML = allCategoryMovies.length
        ? allCategoryMovies.map(movieCardHTML).join('')
        : `<p style="color:var(--muted)">No movies in this category yet.</p>`;
        
      const url = new URL(location);
      cat === 'All' ? url.searchParams.delete('c') : url.searchParams.set('c', cat);
      history.replaceState(null, '', url);
    }

    chipsEl.addEventListener('click', e=>{
      const btn = e.target.closest('.chip');
      if(btn) load(btn.dataset.cat);
    });

    load(active);
  }

  // ---------- DOM setup ----------
  document.addEventListener('DOMContentLoaded', ()=>{
    initLangToggle();
    initScrollReveal();
    renderHome();
    renderCategoryPage();

    // Search input listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterMovies(e.target.value);
      });
    }
  });
}
