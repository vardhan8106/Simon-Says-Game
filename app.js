(function(){
  const COLORS = ["green", "red", "yellow", "blue"];
  const FREQ = { green: 329.63, red: 220.00, yellow: 261.63, blue: 164.81 };

  const pads = Array.from(document.querySelectorAll('.pad'));
  const scoreEl = document.getElementById('score');
  const hubLabel = document.getElementById('hubLabel');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');

  let sequence = [];
  let playerStep = 0;
  let accepting = false;
  let best = Number(localStorage_safe_get());

  function localStorage_safe_get(){
    try { return localStorage.getItem('echo-best') || 0; } catch(e){ return 0; }
  }
  function localStorage_safe_set(v){
    try { localStorage.setItem('echo-best', v); } catch(e){ /* ignore */ }
  }

  hubLabel.textContent = 'best ' + pad2(best);
  function pad2(n){ return String(n).padStart(2, '0'); }

  let audioCtx = null;
  function tone(freq, duration){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration + 0.05);
    } catch(e){ /* audio not available, fail silently */ }
  }

  function litPad(color, duration){
    return new Promise(resolve => {
      const pad = pads.find(p => p.dataset.color === color);
      pad.classList.add('lit');
      tone(FREQ[color], duration/1000);
      setTimeout(() => {
        pad.classList.remove('lit');
        resolve();
      }, duration);
    });
  }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function playSequence(){
    accepting = false;
    setStatus('watch closely', '');
    await sleep(500);
    for(const color of sequence){
      await litPad(color, 420);
      await sleep(180);
    }
    playerStep = 0;
    accepting = true;
    setStatus('your turn', 'go');
  }

  function setStatus(text, kind){
    statusEl.textContent = text;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  function nextRound(){
    sequence.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    scoreEl.textContent = pad2(sequence.length - 1);
    playSequence();
  }

  async function handlePadPress(color){
    if(!accepting) return;
    const pad = pads.find(p => p.dataset.color === color);
    pad.classList.add('lit');
    tone(FREQ[color], 0.18);
    setTimeout(() => pad.classList.remove('lit'), 160);

    if(sequence[playerStep] === color){
      playerStep++;
      if(playerStep === sequence.length){
        accepting = false;
        if(sequence.length - 1 > best){
          best = sequence.length - 1;
          localStorage_safe_set(best);
          hubLabel.textContent = 'best ' + pad2(best);
        }
        setStatus('nice — next round', 'go');
        await sleep(700);
        nextRound();
      }
    } else {
      accepting = false;
      setStatus('pattern broken — game over', 'alert');
      scoreEl.textContent = pad2(sequence.length - 1);
      startBtn.disabled = false;
      startBtn.textContent = 'try again';
    }
  }

  pads.forEach(pad => {
    pad.addEventListener('click', () => handlePadPress(pad.dataset.color));
  });

  startBtn.addEventListener('click', () => {
    sequence = [];
    playerStep = 0;
    scoreEl.textContent = '00';
    startBtn.disabled = true;
    startBtn.textContent = 'start';
    nextRound();
  });
})();