// ==========================================================
// Movie Prime — Admin Prime Logic
// ==========================================================

const loginPanel   = document.getElementById('loginPanel');
const adminContent = document.getElementById('adminContent');
const logoutBtn    = document.getElementById('logoutBtn');

// ---------- Session Verification ----------
async function checkSession(){
  const isLogged = sessionStorage.getItem('mp_admin_logged') === 'true';
  
  if(isLogged){
    loginPanel.style.display = 'none';
    adminContent.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    loadMovies();
  } else {
    loginPanel.style.display = 'block';
    adminContent.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
}

// ---------- Authentication Action ----------
document.getElementById('loginBtn').addEventListener('click', ()=>{
  const username = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');

  if (username === 'MovieprimeAdmin' && password === 'Prashan2002') {
    msg.textContent = '';
    sessionStorage.setItem('mp_admin_logged', 'true');
    checkSession();
  } else {
    msg.textContent = 'Invalid credentials. Only the main Administrator account can access this panel.';
    msg.className='state-msg error';
  }
});

logoutBtn.addEventListener('click', ()=>{
  sessionStorage.removeItem('mp_admin_logged');
  checkSession();
});

// ---------- Google Drive Preview Handling ----------
const fDrive = document.getElementById('fDrive');
const fPreview = document.getElementById('fPreview');
fDrive.addEventListener('input', ()=>{
  const val = fDrive.value.trim();
  const url = driveLinkToImageUrl(val) || val;
  if(url){ fPreview.src = url; fPreview.style.display='block'; }
  else { fPreview.style.display='none'; }
});

// ---------- Form Control Actions ----------
const saveBtn = document.getElementById('saveBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');

function clearForm(){
  document.getElementById('movieId').value = '';
  document.getElementById('fTitle').value = '';
  document.getElementById('fCategory').value = '';
  document.getElementById('fYear').value = '';
  document.getElementById('fRating').value = '';
  document.getElementById('fDescription').value = '';
  document.getElementById('fDrive').value = '';
  document.getElementById('fTrailer').value = '';
  document.getElementById('fLink480').value = '';
  document.getElementById('fLink720').value = '';
  document.getElementById('fLink1080').value = '';
  document.getElementById('fDownload').value = '';
  document.getElementById('fTrending').checked = false;
  fPreview.style.display = 'none';
  formTitle.textContent = 'Add Premium Movie';
  cancelEditBtn.style.display = 'none';
}

saveBtn.addEventListener('click', async ()=>{
  const id = document.getElementById('movieId').value;
  const driveLink = document.getElementById('fDrive').value.trim();
  
  // Extract or direct pass poster image
  const posterUrl = driveLinkToImageUrl(driveLink) || driveLink;

  const payload = {
    title: document.getElementById('fTitle').value.trim(),
    category: document.getElementById('fCategory').value.trim(),
    year: parseInt(document.getElementById('fYear').value) || null,
    rating: parseFloat(document.getElementById('fRating').value) || null,
    description: document.getElementById('fDescription').value.trim(),
    drive_link: driveLink,
    poster_url: posterUrl,
    trailer_link: document.getElementById('fTrailer').value.trim(),
    link_480p: document.getElementById('fLink480').value.trim(),
    link_720p: document.getElementById('fLink720').value.trim(),
    link_1080p: document.getElementById('fLink1080').value.trim(),
    download_link: document.getElementById('fDownload').value.trim(),
    trending: document.getElementById('fTrending').checked
  };
  const msg = document.getElementById('formMsg');

  if(!payload.title || !payload.category){
    msg.textContent = 'Title and Category are required.'; msg.className='state-msg error';
    return;
  }

  msg.textContent = 'Saving details to database…'; msg.className='state-msg';
  let error;
  if(id){
    ({error} = await supabase.from('movies').update(payload).eq('id', id));
  } else {
    ({error} = await supabase.from('movies').insert(payload));
  }

  if(error){
    msg.textContent = error.message; msg.className='state-msg error';
  } else {
    msg.textContent = 'Movie published successfully! ✓'; msg.className='state-msg ok';
    clearForm();
    loadMovies();
  }
});

cancelEditBtn.addEventListener('click', clearForm);

// ---------- Table Loader, Edit, & Delete ----------
async function loadMovies(){
  const tbody = document.getElementById('movieTableBody');
  const {data, error} = await supabase.from('movies').select('*').order('created_at', {ascending:false});
  if(error){
    tbody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
    return;
  }
  if(!data.length){
    tbody.innerHTML = `<tr><td colspan="5">No movies in the catalog yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(m => {
    const poster = m.poster_url || driveLinkToImageUrl(m.drive_link) || '';
    return `
      <tr>
        <td><img src="${poster}" style="opacity:0;transition:opacity .3s" onload="this.style.opacity=1" onerror="this.style.opacity=0.15"></td>
        <td style="font-weight:600;">${m.title}</td>
        <td>${m.category || ''}</td>
        <td>${m.trending ? '<span style="color:var(--primary)">Yes</span>' : 'No'}</td>
        <td>
          <button class="btn secondary" style="margin:0;padding:6px 12px;font-size:12px" data-edit="${m.id}">Edit</button>
          <button class="btn danger" style="margin:0;padding:6px 12px;font-size:12px" data-del="${m.id}">Delete</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=> editMovie(btn.dataset.edit, data));
  });
  tbody.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteMovie(btn.dataset.del));
  });
}

function editMovie(id, data){
  const m = data.find(x=>x.id===id);
  if(!m) return;
  document.getElementById('movieId').value = m.id;
  document.getElementById('fTitle').value = m.title || '';
  document.getElementById('fCategory').value = m.category || '';
  document.getElementById('fYear').value = m.year || '';
  document.getElementById('fRating').value = m.rating || '';
  document.getElementById('fDescription').value = m.description || '';
  document.getElementById('fDrive').value = m.drive_link || '';
  document.getElementById('fTrailer').value = m.trailer_link || '';
  document.getElementById('fLink480').value = m.link_480p || '';
  document.getElementById('fLink720').value = m.link_720p || '';
  document.getElementById('fLink1080').value = m.link_1080p || '';
  document.getElementById('fDownload').value = m.download_link || '';
  document.getElementById('fTrending').checked = !!m.trending;
  
  const poster = m.poster_url || driveLinkToImageUrl(m.drive_link);
  if(poster){ 
    fPreview.src = poster; 
    fPreview.style.display='block'; 
  } else {
    fPreview.style.display='none';
  }
  
  formTitle.textContent = 'Edit Premium Movie';
  cancelEditBtn.style.display = 'inline-block';
  window.scrollTo({top:0, behavior:'smooth'});
}

async function deleteMovie(id){
  if(!confirm('Are you sure you want to delete this movie?')) return;
  const {error} = await supabase.from('movies').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  loadMovies();
}

document.addEventListener('DOMContentLoaded', checkSession);
