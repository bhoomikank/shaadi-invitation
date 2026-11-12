import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUpRight, CalendarDays, Camera, Check, ChevronDown, Clock3, Heart, MapPin, Menu, Music2, Pause, Play, Send, Sparkles, Star, Volume2, VolumeX, X } from 'lucide-react';
import { wedding } from './config';
import { BUCKET, supabase, supabaseReady } from './supabase';

const fmt = (n) => String(n).padStart(4, '0');
function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  return { days: Math.floor(diff / 86400000), hours: Math.floor(diff / 3600000) % 24, minutes: Math.floor(diff / 60000) % 60, seconds: Math.floor(diff / 1000) % 60 };
}
function SectionTitle({ eyebrow, children, light=false }) {
  return <div className={`section-title ${light ? 'light' : ''}`}><span>{eyebrow}</span><h2>{children}</h2><i>✦</i></div>;
}
function App() {
  const countdown = useCountdown(wedding.date);
  const [menuOpen, setMenuOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [guestPhotos, setGuestPhotos] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [rating, setRating] = useState(5);
  const [reviewName, setReviewName] = useState('');
  const [message, setMessage] = useState('');
  const [rsvp, setRsvp] = useState('yes');
  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [status, setStatus] = useState('');
  const [average, setAverage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuActive, setMenuActive] = useState(false);
  const photos = useMemo(() => [...wedding.photos, ...guestPhotos.map(p => p.url)], [guestPhotos]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!supabaseReady) return;
    (async () => {
      const [{ data: photoData }, { data: reviewData }] = await Promise.all([
        supabase.from('wedding_photos').select('id,public_url,caption,created_at').eq('approved', true).order('created_at', { ascending: false }).limit(30),
        supabase.from('wedding_reviews').select('id,name,message,rating,created_at').eq('approved', true).order('created_at', { ascending: false }).limit(30)
      ]);
      setGuestPhotos((photoData || []).map(p => ({ id: p.id, url: p.public_url, caption: p.caption || 'A guest memory' })));
      setWishes(reviewData || []);
      if (reviewData?.length) setAverage(reviewData.reduce((a, r) => a + r.rating, 0) / reviewData.length);
    })();
  }, []);

  const notify = (text) => { setStatus(text); window.setTimeout(() => setStatus(''), 5000); };
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };
  const submitRSVP = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return notify('Please enter your name.');
    if (!supabaseReady) return notify('Connect Supabase first. See the README setup steps.');
    setBusy(true);
    const { error } = await supabase.from('wedding_rsvps').insert({ guest_name: guestName.trim(), attending: rsvp === 'yes', guest_count: rsvp === 'yes' ? Number(guestCount) : 0 });
    setBusy(false);
    if (error) return notify(error.message);
    notify('Your RSVP has been received. We cannot wait to celebrate with you!');
    setGuestName(''); setGuestCount(1);
  };
  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewName.trim() || !message.trim()) return notify('Please add your name and a wish for the couple.');
    if (!supabaseReady) return notify('Connect Supabase first. See the README setup steps.');
    setBusy(true);
    const { error } = await supabase.from('wedding_reviews').insert({ name: reviewName.trim(), message: message.trim(), rating });
    setBusy(false);
    if (error) return notify(error.message);
    notify('Thank you for your lovely wishes!');
    setReviewName(''); setMessage('');
  };
  const uploadPhoto = async (e) => {
    e.preventDefault();
    if (!uploadFile) return notify('Choose a photo first.');
    if (!supabaseReady) return notify('Connect Supabase first. See the README setup steps.');
    if (uploadFile.size > 20 * 1024 * 1024) return notify('Please choose an image smaller than 20 MB.');
    setBusy(true);
    const safeName = `${crypto.randomUUID()}-${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(safeName, uploadFile, { contentType: uploadFile.type, upsert: false });
    if (uploadError) { setBusy(false); return notify(uploadError.message); }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(safeName);
    const { error } = await supabase.from('wedding_photos').insert({ storage_path: safeName, public_url: urlData.publicUrl });
    setBusy(false);
    if (error) return notify(error.message);
    notify('Photo uploaded! It will appear in the gallery after approval.');
    setUploadFile(null); setUploadPreview('');
  };

  return <div className="site">
    <audio id="wedding-audio" src="/music/wedding.mp3" loop />
    <button className="music-toggle" aria-label="Toggle music" onClick={() => { const a = document.getElementById('wedding-audio'); if (musicOn) a.pause(); else a.play().catch(() => notify('Add your music file at public/music/wedding.mp3.')); setMusicOn(!musicOn); }}>
      {musicOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}<span>{musicOn ? 'Music on' : 'Music off'}</span>
    </button>
    <header className="nav">
      <a className="brand" href="#home" onClick={e => {e.preventDefault();scrollTo('home')}}>{wedding.bride[0]} <b>&</b> {wedding.groom[0]}<small>THE WEDDING</small></a>
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={menuOpen ? 'open' : ''}>{[['Our Story','story'],['Celebrations','events'],['Venue','venue'],['Gallery','gallery'],['RSVP','rsvp']].map(([label,id]) => <a key={id} href={`#${id}`} onClick={e => {e.preventDefault();scrollTo(id)}}>{label}</a>)}</nav>
      <button className="nav-rsvp" onClick={() => scrollTo('rsvp')}>RSVP <ArrowUpRight size={15}/></button>
    </header>

    <main>
      <section className="hero" id="home">
        <div className="hero-image"></div><div className="hero-wash"></div>
        <div className="hero-content">
          <p className="eyebrow"><span>✧</span> A CELEBRATION OF LOVE <span>✧</span></p>
          <p className="invite-line">Together with our families, we invite you to celebrate</p>
          <div className="name-reveal"><h1>{wedding.bride}<em>&</em>{wedding.groom}</h1></div>
          <p className="getting-married">WE ARE GETTING MARRIED</p>
          <div className="hero-rule"><span>✦</span></div>
          <p className="hero-date">{wedding.dateLabel} <i>·</i> Gokarna, India</p>
          <button className="explore" onClick={() => scrollTo('story')}>EXPLORE OUR INVITATION <ArrowDown size={15}/></button>
        </div>
        <span className="hero-corner top-left">❧</span><span className="hero-corner bottom-right">❧</span>
      </section>

      <section className="intro section-pad" id="story">
        <div className="intro-ornament reveal">❦</div>
        <SectionTitle eyebrow="THE BEGINNING OF FOREVER">Two souls, one beautiful story</SectionTitle>
        <p className="intro-copy reveal">{wedding.intro}</p>
        <p className="signature reveal">{wedding.bride} <span>&</span> {wedding.groom}</p>
        <div className="couple-grid reveal">
          <figure><img src="https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=900&q=85" alt="Bride portrait placeholder"/><figcaption><b>{wedding.bride}</b><small>THE BRIDE</small></figcaption></figure>
          <div className="couple-heart">♡</div>
          <figure><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85" alt="Groom portrait placeholder"/><figcaption><b>{wedding.groom}</b><small>THE GROOM</small></figcaption></figure>
        </div>
     </section>

      <section className="countdown-section">
        <div className="countdown-bg"></div><div className="countdown-inner reveal">
          <p className="eyebrow">SAVE THE DATE</p><h2>Counting down to our forever</h2><p className="countdown-date">{wedding.dateLabel}</p>
          <div className="countdown">{[['DAYS',countdown.days],['HOURS',countdown.hours],['MINUTES',countdown.minutes],['SECONDS',countdown.seconds]].map(([label,value]) => <div key={label}><strong>{fmt(value)}</strong><span>{label}</span></div>)}</div>
          <span className="countdown-flower">✿</span>
          
        </div>
      </section>

      <section className="events section-pad" id="events">
        <SectionTitle eyebrow="THE WEDDING CELEBRATIONS">Four days of joy</SectionTitle>
        <p className="section-lead">A little gathering, a lifetime of memories. We would love to have you with us at every celebration.</p>
        <div className="event-list">{wedding.events.map((ev,i) => <article className={`event-card ${ev.theme} reveal`} key={ev.name}>
          <div className="event-number">{String(i+1).padStart(2,'0')}</div><div className="event-icon">{ev.icon}</div>
          <div className="event-main"><span>{ev.day}</span><h3>{ev.name}</h3><p>{ev.note}</p></div>
          <div className="event-details"><p><CalendarDays size={15}/>{ev.date}</p><p><Clock3 size={15}/>{ev.time}</p><p><MapPin size={15}/>{ev.venue}</p></div>
        </article>)}</div>
      </section>

      <section className="venue-section section-pad" id="venue">
        <SectionTitle eyebrow="WHERE TO JOIN US" light>Find your way to us</SectionTitle>
        <div className="venue-layout reveal">
          <div className="venue-photo"><img src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85" alt="Wedding venue sample"/></div>
          <div className="venue-info"><span className="eyebrow">THE WEDDING VENUE</span><h3>{wedding.venue}</h3><p>{wedding.address}</p><div className="venue-divider">✦</div><a className="gold-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(wedding.mapQuery)}`} target="_blank" rel="noreferrer">GET DIRECTIONS <ArrowUpRight size={16}/></a></div>
        </div>
        <div className="map-wrap reveal"><iframe title="Wedding venue map" src={`https://www.google.com/maps?q=${encodeURIComponent(wedding.mapQuery)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen></iframe></div>
      </section>

      <section className="gallery section-pad" id="gallery">
        <SectionTitle eyebrow="MOMENTS TO TREASURE">A glimpse of our love</SectionTitle>
        <p className="section-lead">Every picture tells a little piece of our story. Help us make this album even more special.</p>
        <div className="photo-grid">{photos.map((url,i) => <button className={`photo-tile tile-${i%5} reveal`} key={`${url}-${i}`} onClick={() => setLightbox(url)}><img src={url} alt={`Wedding memory ${i+1}`} loading="lazy"/><span><Sparkles size={17}/></span></button>)}</div>
        <div className="upload-panel reveal"><div><Camera size={24}/><h3>Share a beautiful memory</h3><p>Upload a photo from the celebration and add it to our shared memories.</p></div>
          <form onSubmit={uploadPhoto} className="upload-form">
            <label className="file-pick">CHOOSE A PHOTO<input type="file" accept="image/*" onChange={e => {const f=e.target.files?.[0];setUploadFile(f||null);setUploadPreview(f?URL.createObjectURL(f):'')}}/></label>
            {uploadPreview && <img className="preview" src={uploadPreview} alt="Selected upload preview"/>}
            <button className="dark-button" disabled={busy || !uploadFile}>{busy ? 'UPLOADING…' : 'UPLOAD PHOTO'} <ArrowUpRight size={15}/></button>
          </form>
        </div>
        {!supabaseReady && <p className="backend-note">Guest photo sharing becomes active after you connect your Supabase project.</p>}
      </section>

      <section className="wishes-section section-pad">
        <SectionTitle eyebrow="A LITTLE LOVE FROM YOU" light>How do you feel about our wedding?</SectionTitle>
        <div className="wishes-layout">
          <form className="wish-form reveal" onSubmit={submitReview}>
            <label>Your name<input value={reviewName} onChange={e=>setReviewName(e.target.value)} placeholder="Your name" maxLength="80" required/></label>
            <div className="rating-field"><span>Your love rating</span><div className="stars">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n} stars`} onClick={()=>setRating(n)} className={n<=rating?'selected':''}><Star fill={n<=rating?'currentColor':'none'} size={27}/></button>)}</div></div>
            <label>Your wishes<textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write a little note for the couple…" rows="4" maxLength="500" required/></label>
            <button className="gold-button" disabled={busy}>{busy?'SENDING…':'SEND YOUR WISHES'} <Send size={15}/></button>
          </form>
          <div className="wishes-wall reveal"><div className="wall-heading"><span>THE WISHES WALL</span><div className="avg-rating"><Star size={16} fill="currentColor"/>{average ? average.toFixed(1) : '—'} <small>/ 5</small></div></div>
            {wishes.length ? wishes.map(w=><article className="wish" key={w.id}><div className="wish-stars">{'★'.repeat(w.rating)}<span>{'★'.repeat(5-w.rating)}</span></div><p>“{w.message}”</p><b>{w.name}</b></article>) : <div className="empty-wishes"><span>♡</span><p>Your wishes will appear here after they are approved.</p></div>}
          </div>
        </div>
        {!supabaseReady && <p className="backend-note light-note">Connect Supabase to save ratings and guest wishes.</p>}
      </section>

      <section className="rsvp section-pad" id="rsvp">
        <div className="rsvp-flower">❀</div><SectionTitle eyebrow="KINDLY RESPOND" >Will you join our celebration?</SectionTitle>
        <p className="section-lead">Your presence would mean the world to us. Please let us know by 1 February 2027.</p>
        <form className="rsvp-form reveal" onSubmit={submitRSVP}>
          <label>Your full name<input value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Enter your name" maxLength="100" required/></label>
          <div className="attend-options"><button type="button" className={rsvp==='yes'?'active':''} onClick={()=>setRsvp('yes')}><span>♡</span> YES, HAPPILY ATTENDING</button><button type="button" className={rsvp==='no'?'active':''} onClick={()=>setRsvp('no')}><span>♡</span> SORRY, CANNOT ATTEND</button></div>
          {rsvp==='yes' && <label>Number of guests (including you)<select value={guestCount} onChange={e=>setGuestCount(e.target.value)}>{[1,2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label>}
          <button className="dark-button submit-rsvp" disabled={busy}>{busy?'SENDING…':'CONFIRM RSVP'} <ArrowUpRight size={16}/></button>
        </form>
        {!supabaseReady && <p className="backend-note">RSVP submissions will be saved securely after Supabase setup.</p>}
      </section>

      <footer className="footer">
        <span className="footer-flower">❦</span><p className="eyebrow">WITH LOVE & JOY</p><h2>Thank you for being part of our story.</h2><p className="footer-message">Your presence will make our celebration more special. We cannot wait to create beautiful memories with you.</p><div className="footer-names">{wedding.bride} <span>&</span> {wedding.groom}</div><p className="footer-date">{wedding.dateLabel} · Gokarna</p><span className="footer-bottom"> <Heart size={15} fill="currentColor"/></span>
      </footer>
    </main>
    {status && <div className="toast" role="status"><Check size={17}/>{status}<button onClick={()=>setStatus('')}><X size={15}/></button></div>}
    {lightbox && <div className="lightbox" onClick={()=>setLightbox(null)}><button aria-label="Close image"><X/></button><img src={lightbox} alt="Expanded wedding memory" onClick={e=>e.stopPropagation()}/></div>}
  </div>;
}
export default App;