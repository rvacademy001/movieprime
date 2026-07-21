// ==========================================================
// Movie Prime — Member Area & Watchlist Logic
// ==========================================================

const supabase = window.supabaseClient;

const authPanel       = document.getElementById('authPanel');
const memberDashboard = document.getElementById('memberDashboard');
const logoutBtn       = document.getElementById('logoutBtn');
const authBtn         = document.getElementById('authBtn');
const authToggle      = document.getElementById('authToggle');
const authTitle       = document.getElementById('authTitle');
const authMsg         = document.getElementById('authMsg');
const watchlistGrid   = document.getElementById('watchlistGrid');

let isSignUpMode = false;

// ---------- Session Checker ----------
async function checkMemberSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    authPanel.style.display = 'none';
    memberDashboard.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    
    const email = session.user.email;
    const lang = localStorage.getItem('mp_lang') || 'en';
    const helloText = lang === 'si' ? 'ආයුබෝවන්' : 'Welcome';
    document.getElementById('welcomeMsg').textContent = `${helloText}, ${email}!`;
    
    loadWatchlist(session.user.id);
  } else {
    authPanel.style.display = 'block';
    memberDashboard.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
}

// ---------- Toggle Sign Up / Login ----------
authToggle.addEventListener('click', () => {
  isSignUpMode = !isSignUpMode;
  const lang = localStorage.getItem('mp_lang') || 'en';
  
  if (isSignUpMode) {
    authTitle.textContent = lang === 'si' ? 'සාමාජික ලියාපදිංචිය' : 'Member Sign Up';
    authBtn.textContent = lang === 'si' ? 'ලියාපදිංචි වන්න' : 'Sign Up';
    authToggle.textContent = lang === 'si' ? 'දැනටමත් ගිණුමක් තිබේද? ඇතුළු වන්න' : 'Already have an account? Log In';
  } else {
    authTitle.textContent = lang === 'si' ? 'සාමාජික ප්‍රවේශය' : 'Member Login';
    authBtn.textContent = lang === 'si' ? 'ප්‍රවේශ වන්න' : 'Log In';
    authToggle.textContent = lang === 'si' ? 'ගිණුමක් නොමැතිද? ලියාපදිංචි වන්න' : "Don't have an account? Sign Up";
  }
  authMsg.textContent = '';
});

// ---------- Submit Auth Actions ----------
authBtn.addEventListener('click', async () => {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  
  if (!email || !password) {
    const lang = localStorage.getItem('mp_lang') || 'en';
    authMsg.textContent = lang === 'si' ? 'ඊමේල් සහ මුරපදය ඇතුළත් කරන්න.' : 'Email and password are required.';
    authMsg.className = 'state-msg error';
    return;
  }
  
  authMsg.textContent = isSignUpMode ? 'Creating account...' : 'Logging in...';
  authMsg.className = 'state-msg';
  
  if (isSignUpMode) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      authMsg.textContent = error.message;
      authMsg.className = 'state-msg error';
    } else {
      const lang = localStorage.getItem('mp_lang') || 'en';
      authMsg.textContent = lang === 'si' ? 'ලියාපදිංචිය සාර්ථකයි! දැන් ඇතුළු වන්න.' : 'Sign up successful! Please check your email or log in.';
      authMsg.className = 'state-msg ok';
      isSignUpMode = false;
      authToggle.click(); // switch back to login mode automatically
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      authMsg.textContent = error.message;
      authMsg.className = 'state-msg error';
    } else {
      authMsg.textContent = '';
      checkMemberSession();
    }
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  checkMemberSession();
});

// ---------- Load Saved Watchlist ----------
async function loadWatchlist(userId) {
  const lang = localStorage.getItem('mp_lang') || 'en';
  watchlistGrid.innerHTML = `<p style="color:var(--muted)">${lang === 'si' ? 'පූරණය වෙමින් පවතී...' : 'Loading watchlist...'}</p>`;

  // Select joined movie information from the database
  const { data, error } = await supabase
    .from('watchlist')
    .select('id, movies(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    watchlistGrid.innerHTML = `<p style="color:var(--crimson)">${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    watchlistGrid.innerHTML = `
      <p style="color:var(--muted)">
        ${lang === 'si' ? 'ඔබ තවමත් කිසිදු චිත්‍රපටයක් සුරැකීමට එක් කර නැත.' : 'Your watchlist is empty. Explore movies and save them here!'}
      </p>`;
    return;
  }

  watchlistGrid.innerHTML = data.map(item => {
    const m = item.movies;
    if (!m) return '';
    const poster = m.poster_url || driveLinkToImageUrl(m.drive_link) || '';
    const removeText = lang === 'si' ? 'මකන්න' : 'Remove';
    return `
      <div class="card" id="wl-item-${item.id}">
        <a href="movie.html?id=${m.id}">
          <div class="poster-wrap">
            <img src="${poster}" alt="${m.title}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.opacity=0.15">
          </div>
          <div class="card-body">
            <p class="title">${m.title}</p>
            <div class="meta">
              <span>${m.year || ''}</span>
              ${m.rating ? `<span class="rating">★ ${m.rating}</span>` : ''}
            </div>
          </div>
        </a>
        <div style="padding: 0 14px 14px;">
          <button class="btn danger" style="margin:0; width:100%; padding:8px; font-size:12px;" onclick="removeFromWatchlist('${item.id}', '${userId}')">
            ${removeText}
          </button>
        </div>
      </div>`;
  }).join('');
}

// ---------- Remove Item Action ----------
window.removeFromWatchlist = async function(watchlistId, userId) {
  if (!confirm('Remove this movie from your watchlist?')) return;
  
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('id', watchlistId);
    
  if (error) {
    alert(error.message);
  } else {
    loadWatchlist(userId);
  }
};

document.addEventListener('DOMContentLoaded', checkMemberSession);
