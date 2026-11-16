// =====================================================================
// AxoGo — nuvem (Supabase): login com Google e progresso salvo online.
// O app continua 100% funcional offline; quando há conta, tudo que muda
// é enviado pra nuvem e, ao entrar em outro celular, o progresso volta.
// =====================================================================
const SB_URL = 'https://wrvcyfuatpabzgmcjzul.supabase.co';
const SB_KEY = 'sb_publishable_zpkCEReFQrnDbOxe7Sky3A_xicWHSSK';
const REDIRECT_APP = 'com.axogo.app://auth';

const NATIVE = (typeof window.AxoNative !== 'undefined') ? window.AxoNative : null;
const nat = (fn, ...a) => { try { return NATIVE && typeof NATIVE[fn] === 'function' ? NATIVE[fn](...a) : undefined; } catch (e) { return undefined; } };

let sb = null;
const listeners = new Set();
const emit = () => listeners.forEach(f => { try { f(cloud); } catch (e) { console.error(e); } });

export const cloud = {
  user: null,           // usuário logado (Supabase)
  status: 'off',        // off | idle | syncing | ok | offline | error
  lastSync: 0,
  error: '',
  busy: false,

  /** Login possível aqui? No APK (casca 2+) sempre; no navegador só fora de iframe. */
  canLogin() {
    if (!window.supabase || SB_KEY.startsWith('__')) return false;
    if (NATIVE) return typeof NATIVE.openExternal === 'function';
    try { return window.top === window.self && /^https?:$/.test(location.protocol); } catch (e) { return false; }
  },
  needsNewApk() { return !!NATIVE && typeof NATIVE.openExternal !== 'function'; },
  onChange(f) { listeners.add(f); return () => listeners.delete(f); },

  name() { const m = this.user?.user_metadata || {}; return m.full_name || m.name || (this.user?.email || '').split('@')[0] || ''; },
  firstName() { const m = this.user?.user_metadata || {}; return (m.given_name || this.name().split(' ')[0] || '').slice(0, 20); },
  email() { return this.user?.email || ''; },
  avatar() { const m = this.user?.user_metadata || {}; return m.avatar_url || m.picture || ''; },

  async init(onAuth) {
    if (!window.supabase || SB_KEY.startsWith('__')) return;
    sb = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'axogo-auth' },
    });
    try { const { data } = await sb.auth.getSession(); this.user = data.session?.user || null; } catch (e) { this.user = null; }
    this.status = this.user ? 'idle' : 'off';
    sb.auth.onAuthStateChange((ev, session) => {
      const before = this.user?.id; this.user = session?.user || null;
      if (!this.user) this.status = 'off';
      if (before !== this.user?.id) { onAuth && setTimeout(() => onAuth(ev, this.user), 0); }
      emit();
    });
    // volta do Google pelo navegador (APK): com.axogo.app://auth?code=...
    window.addEventListener('axogo-auth', e => { nat('pendingAuth'); this.handleReturn(e.detail && e.detail.url); });
    const pend = nat('pendingAuth'); if (pend) this.handleReturn(pend);
    // navegador comum: ?code= na própria página
    if (!NATIVE) { try { const u = new URL(location.href); if (u.searchParams.get('code')) this.handleReturn(location.href); } catch (e) {} }
    window.addEventListener('online', () => { if (this.user && this._flush) this._flush(); });
    emit();
  },

  async signIn() {
    if (!sb) throw new Error('Nuvem indisponível');
    this.error = ''; this.busy = true; emit();
    const redirectTo = NATIVE ? REDIRECT_APP : location.href.split('#')[0].split('?')[0];
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error) { this.busy = false; this.error = error.message; emit(); throw error; }
    if (NATIVE) nat('openExternal', data.url); else location.assign(data.url);
    // se a pessoa fechar o navegador sem entrar, libera o botão depois de um tempo
    clearTimeout(this._bt); this._bt = setTimeout(() => { this.busy = false; emit(); }, 90000);
  },

  async handleReturn(url) {
    if (!url || !sb) return;
    clearTimeout(this._bt);
    let u; try { u = new URL(url.replace(/^com\.axogo\.app:\/\//, 'https://x/')); } catch (e) { return; }
    const p = new URLSearchParams(u.search + '&' + u.hash.replace(/^#/, ''));
    if (!NATIVE) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
    if (p.get('error')) { this.busy = false; this.error = p.get('error_description') || p.get('error'); emit(); window.dispatchEvent(new CustomEvent('axogo-login-failed', { detail: this.error })); return; }
    const code = p.get('code'); if (!code || code === this._lastCode) { this.busy = false; emit(); return; }
    this._lastCode = code;
    const { error } = await sb.auth.exchangeCodeForSession(code);
    this.busy = false;
    if (error) { this.error = error.message; emit(); window.dispatchEvent(new CustomEvent('axogo-login-failed', { detail: error.message })); }
  },

  async signOut() { if (!sb) return; try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {} this.user = null; this.status = 'off'; emit(); },

  /** Busca o progresso salvo e as atividades recentes. */
  async pull() {
    if (!sb || !this.user) return null;
    const uid = this.user.id;
    const [pr, ac] = await Promise.all([
      sb.from('progress').select('state,updated_at,xp,streak').eq('user_id', uid).maybeSingle(),
      sb.from('activities').select('id,ts,day,kind,title,secs,km,kcal,xp,path').eq('user_id', uid).order('ts', { ascending: false }).limit(60),
    ]);
    if (pr.error) throw pr.error; if (ac.error) throw ac.error;
    return {
      progress: pr.data ? { state: pr.data.state, updatedAt: pr.data.updated_at, xp: pr.data.xp, streak: pr.data.streak } : null,
      acts: (ac.data || []).map(a => ({ id: a.id, ts: Date.parse(a.ts), day: a.day, kind: a.kind, title: a.title, secs: a.secs, km: +a.km, kcal: a.kcal, xp: a.xp, path: a.path || undefined, synced: true })),
    };
  },

  async pushState(state, meta) {
    if (!sb || !this.user) return null;
    const { data, error } = await sb.from('progress').upsert({
      user_id: this.user.id, state, xp: meta.xp | 0, streak: meta.streak | 0, name: meta.name || null, partner: meta.partner || null,
    }, { onConflict: 'user_id' }).select('updated_at').single();
    if (error) throw error;
    return data.updated_at;
  },

  async pushActs(acts) {
    if (!sb || !this.user || !acts.length) return;
    const rows = acts.map(a => ({ user_id: this.user.id, id: a.id, ts: new Date(a.ts).toISOString(), day: a.day, kind: a.kind, title: (a.title || '').slice(0, 80),
      secs: Math.max(0, Math.min(86399, a.secs | 0)), km: +(a.km || 0).toFixed(3), kcal: a.kcal | 0, xp: a.xp | 0, path: a.path || null }));
    const { error } = await sb.from('activities').upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true });
    if (error) throw error;
  },

  async deleteAccount() {
    if (!sb || !this.user) return;
    const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
    if (error) throw error;
    await this.signOut();
  },

  setStatus(s, err) { this.status = s; if (s === 'ok') this.lastSync = Date.now(); this.error = err || ''; emit(); },
};
