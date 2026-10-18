/* Portfolio visit tracker: free, no cookies, no ads.
   Logs anonymous visits to Harini's own Google Sheet through a Google Apps Script web app.

   SETUP: paste your Apps Script web app URL between the quotes below and commit.
   Until it's filled in, nothing is sent anywhere. */
var SHEET_URL = '';

(function () {
  try {
    if (!SHEET_URL) return;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    var ls = window.localStorage, ss = window.sessionStorage, q = new URLSearchParams(location.search);

    /* Visit any page once with ?me=1 to stop counting your own visits on that browser (?me=0 undoes it). */
    if (q.get('me') === '1') ls.setItem('hp-me', '1');
    if (q.get('me') === '0') ls.removeItem('hp-me');
    if (ls.getItem('hp-me') === '1') return;

    /* Company links look like .../Portfolio/?ref=razorpay. The ref is remembered for 30 days on that browser,
       so every page they open afterwards is credited to that link. */
    var ref = (q.get('ref') || q.get('utm_source') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    var now = Date.now();
    if (ref) ls.setItem('hp-ref', JSON.stringify({ r: ref, t: now }));
    else { try { var s = JSON.parse(ls.getItem('hp-ref') || 'null'); if (s && now - s.t < 30 * 864e5) ref = s.r; } catch (e) {} }

    var vid = ls.getItem('hp-vid'); if (!vid) { vid = Math.random().toString(36).slice(2, 10); ls.setItem('hp-vid', vid); }
    var sid = ss.getItem('hp-sid'); if (!sid) { sid = Math.random().toString(36).slice(2, 8); ss.setItem('hp-sid', sid); }
    var page = (location.pathname.split('/').pop() || 'index.html') + (location.hash === '#full' ? '#full' : '');
    var refHost = ''; try { refHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    if (refHost === location.hostname) refHost = '';
    var base = {
      company: ref || '', page: page, from: refHost,
      device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : (innerWidth < 1024 ? 'tablet' : 'desktop'),
      screen: innerWidth + 'x' + innerHeight, lang: navigator.language || '',
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), visitor: vid, session: sid
    };
    function send(ev, extra) {
      var d = Object.assign({ event: ev, time: new Date().toISOString() }, base, extra || {});
      var body = JSON.stringify(d);
      if (navigator.sendBeacon) navigator.sendBeacon(SHEET_URL, new Blob([body], { type: 'text/plain' }));
      else fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: body, keepalive: true });
    }
    send('view');

    var maxScroll = 0, t0 = now, sentLeave = false;
    addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0) maxScroll = Math.max(maxScroll, Math.round(scrollY / h * 100));
    }, { passive: true });
    function leave() { if (sentLeave) return; sentLeave = true; send('leave', { seconds: Math.round((Date.now() - t0) / 1000), scrolled: maxScroll + '%' }); }
    addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); });

    /* a few clicks worth knowing about */
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('a,button'); if (!el) return;
      var h = el.getAttribute('href') || '';
      if (el.classList.contains('full-btn')) send('read-full');
      else if (/Resume\.pdf|resume\.pdf/.test(h)) send('resume');
      else if (/^mailto:/.test(h) || el.id === 'copy') send('email');
      else if (/linkedin\.com/.test(h)) send('linkedin');
      else if (/figma\.com/.test(h)) send('figma');
    }, true);
  } catch (e) {}
})();
