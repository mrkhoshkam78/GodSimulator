(() => {
  const urlInput = document.getElementById('url');
  const btn = document.getElementById('btn');
  const progress = document.getElementById('progress');
  const stage = document.getElementById('stage');
  const pct = document.getElementById('pct');
  const fill = document.getElementById('fill');
  const result = document.getElementById('result');
  const summary = document.getElementById('summary');
  const download = document.getElementById('download');
  const error = document.getElementById('error');
  const errMsg = document.getElementById('errMsg');
  const retry = document.getElementById('retry');

  let pollTimer = null;

  function hideAll() {
    progress.hidden = true;
    result.hidden = true;
    error.hidden = true;
  }

  function setProgress(s, p) {
    hideAll();
    progress.hidden = false;
    stage.textContent = s || 'در حال پردازش…';
    pct.textContent = (p || 0) + '%';
    fill.style.width = (p || 0) + '%';
  }

  function showError(msg) {
    if (pollTimer) clearInterval(pollTimer);
    hideAll();
    error.hidden = false;
    errMsg.textContent = msg || 'خطای ناشناخته';
  }

  function showResult(job) {
    if (pollTimer) clearInterval(pollTimer);
    hideAll();
    result.hidden = false;
    const s = job.stats || {};
    summary.textContent = `CSS: ${s.css || 0} | JS: ${s.js || 0} | تصاویر: ${s.images || 0} | فونت: ${s.fonts || 0} | دانلود شده: ${s.downloaded || 0}`;
    download.href = job.zipUrl;
    download.setAttribute('download', 'site-source.zip');
  }

  async function start() {
    const url = (urlInput.value || '').trim();
    if (!url) { urlInput.focus(); return; }
    if (!/^https?:\/\//i.test(url)) {
      showError('آدرس باید با http:// یا https:// شروع شود');
      return;
    }
    hideAll();
    setProgress('ارسال درخواست…', 5);
    btn.disabled = true;

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در درخواست');
      poll(data.jobId);
    } catch (e) {
      showError(e.message);
      btn.disabled = false;
    }
  }

  function poll(jobId) {
    if (pollTimer) clearInterval(pollTimer);
    const tick = async () => {
      try {
        const res = await fetch('/api/job/' + jobId);
        const job = await res.json();
        if (!res.ok) throw new Error(job.error || 'جاب پیدا نشد');
        if (job.status === 'running') {
          setProgress(job.stage || 'در حال کار…', job.progress || 10);
        } else if (job.status === 'completed') {
          showResult(job);
          btn.disabled = false;
        } else if (job.status === 'failed') {
          showError(job.error || 'استخراج ناموفق بود');
          btn.disabled = false;
        }
      } catch (e) {
        showError(e.message);
        btn.disabled = false;
      }
    };
    tick();
    pollTimer = setInterval(tick, 1000);
  }

  btn.addEventListener('click', start);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') start(); });
  retry.addEventListener('click', () => { hideAll(); btn.disabled = false; });
})();
