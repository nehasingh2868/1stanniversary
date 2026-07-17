// State Variables
let currentPageIndex = 1;      // Used for mobile (1 to 11)
let currentSpreadIndex = 1;     // Used for desktop (1 to 6)
let isLocked = true;           // Diary starts locked
let isTurningPage = false;
let isMobile = window.innerWidth < 768;

const totalPages = 30;
const totalSpreads = 16;
let isPlayingPlayerSong = false;
let isPlayingMusic = false;
let notesInterval = null;
let hasStartedBgMusic = false;

// Dynamic z-index updating based on current spread/page index to prevent overlapping sheets
function updatePageZIndices() {
  isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    for (let i = 1; i <= totalPages; i++) {
      const page = document.getElementById(`page-${i}`);
      if (!page) continue;
      
      if (i < currentPageIndex) {
        page.style.zIndex = i;
        page.style.pointerEvents = 'none';
      } else if (i === currentPageIndex) {
        page.style.zIndex = totalPages + 10;
        page.style.pointerEvents = 'auto';
      } else {
        page.style.zIndex = totalPages - i + 1;
        page.style.pointerEvents = 'none';
      }
    }
  } else {
    const activeLeftPageIndex = 2 * currentSpreadIndex - 2;
    const activeRightPageIndex = 2 * currentSpreadIndex - 1;
    
    for (let i = 1; i <= totalPages; i++) {
      const page = document.getElementById(`page-${i}`);
      if (!page) continue;
      
      if (i < activeLeftPageIndex) {
        page.style.zIndex = i;
        page.style.pointerEvents = 'none';
      } else if (i === activeLeftPageIndex || i === activeRightPageIndex) {
        page.style.zIndex = totalPages + 20;
        page.style.pointerEvents = 'auto';
      } else {
        page.style.zIndex = totalPages - i;
        page.style.pointerEvents = 'none';
      }
    }
  }
}

// Audio Elements
const bgMusic = document.getElementById('bg-music');
const musicPlayer = document.getElementById('music-player');
const musicRecord = document.getElementById('music-record');
const musicNeedle = document.getElementById('music-needle');
const musicNotesContainer = document.getElementById('music-notes');

// Audio Context for Tactile sound effects
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playPageTurnSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.22);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
}

function playSealCrackSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
}

/* ==========================================
   Navigation Controls & State Machine
   ========================================== */
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  if (isMobile) {
    prevBtn.disabled = (currentPageIndex === 1);
    nextBtn.disabled = (currentPageIndex === totalPages);
    
    // Auto-pause new player song if we navigate away from Page 29 on mobile
    if (currentPageIndex !== 29 && typeof isPlayingPlayerSong !== 'undefined' && isPlayingPlayerSong) {
      const playerSong = document.getElementById('player-song');
      if (playerSong) {
        playerSong.pause();
        isPlayingPlayerSong = false;
      }
    }
  } else {
    prevBtn.disabled = (currentSpreadIndex === 1);
    nextBtn.disabled = (currentSpreadIndex === totalSpreads);
    
    // Auto-pause new player song if we navigate away from Spread 15 (Pages 28 & 29) on desktop
    if (currentSpreadIndex !== 15 && typeof isPlayingPlayerSong !== 'undefined' && isPlayingPlayerSong) {
      const playerSong = document.getElementById('player-song');
      if (playerSong) {
        playerSong.pause();
        isPlayingPlayerSong = false;
      }
    }
  }
  
  // Fade scroll hint once navigated away from Page 1 (Cover)
  const scrollHint = document.getElementById('scroll-down-hint');
  if (scrollHint) {
    if (isMobile) {
      if (currentPageIndex > 1) {
        scrollHint.style.opacity = '0';
        scrollHint.style.pointerEvents = 'none';
      } else {
        scrollHint.style.opacity = '0.85';
      }
    } else {
      if (currentSpreadIndex > 1) {
        scrollHint.style.opacity = '0';
        scrollHint.style.pointerEvents = 'none';
      } else {
        scrollHint.style.opacity = '0.85';
      }
    }
  }
}

// Flip page function
function turnPage(direction) {
  if (isTurningPage || isLocked) return;
  
  isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    // MOBILE SEQUENTIAL TURN
    if (direction === 1) {
      if (currentPageIndex < totalPages) {
        isTurningPage = true;
        playPageTurnSound();
        
        const pageToFlip = document.getElementById(`page-${currentPageIndex}`);
        pageToFlip.classList.add('flipped');
        
        currentPageIndex++;
        updatePageZIndices();
        updateNavigationButtons();
        updatePaperThickness();
        
        setTimeout(() => { isTurningPage = false; }, 1300);
      } else {
        // Last page! Turn forward again to close booklet & show outro screen
        closeDiaryAndShowCredits();
      }
    } else if (direction === -1) {
      if (currentPageIndex > 1) {
        isTurningPage = true;
        playPageTurnSound();
        
        currentPageIndex--;
        updatePageZIndices();
        
        const pageToUnflip = document.getElementById(`page-${currentPageIndex}`);
        pageToUnflip.classList.remove('flipped');
        
        updateNavigationButtons();
        updatePaperThickness();
        
        setTimeout(() => { isTurningPage = false; }, 1300);
      }
    }
  } else {
    // DESKTOP SPREAD TURN
    if (direction === 1) {
      if (currentSpreadIndex < totalSpreads) {
        isTurningPage = true;
        playPageTurnSound();
        
        const rightPageToFlip = document.getElementById(`page-${2 * currentSpreadIndex - 1}`);
        const leftPageToActivate = document.getElementById(`page-${2 * currentSpreadIndex}`);
        
        if (rightPageToFlip) rightPageToFlip.classList.add('flipped-right');
        if (leftPageToActivate) leftPageToActivate.classList.add('active-left');
        
        currentSpreadIndex++;
        updatePageZIndices();
        updateNavigationButtons();
        updatePaperThickness();
        
        // Remove closed-book class offset when turning the cover spread
        const diaryContainer = document.getElementById('diary-container');
        if (currentSpreadIndex > 1) {
          diaryContainer.classList.remove('closed-book');
        }
        
        setTimeout(() => { isTurningPage = false; }, 1300);
      } else {
        // Last spread! Turn forward again to close booklet & show outro screen
        closeDiaryAndShowCredits();
      }
    } else if (direction === -1) {
      if (currentSpreadIndex > 1) {
        isTurningPage = true;
        playPageTurnSound();
        
        currentSpreadIndex--;
        updatePageZIndices();
        
        const rightPageToUnflip = document.getElementById(`page-${2 * currentSpreadIndex - 1}`);
        const leftPageToDeactivate = document.getElementById(`page-${2 * currentSpreadIndex}`);
        
        if (rightPageToUnflip) rightPageToUnflip.classList.remove('flipped-right');
        if (leftPageToDeactivate) leftPageToDeactivate.classList.remove('active-left');
        
        updateNavigationButtons();
        updatePaperThickness();
        
        // Add closed-book class offset back when returning to Cover Spread
        const diaryContainer = document.getElementById('diary-container');
        if (currentSpreadIndex === 1) {
          diaryContainer.classList.add('closed-book');
        }
        
        setTimeout(() => { isTurningPage = false; }, 1300);
      }
    }
  }
}

// Update paper stack thickness effect
function updatePaperThickness() {
  const thickness = document.querySelector('.paper-edge-thickness');
  if (!thickness) return;
  
  let percentageLeft = 1;
  if (isMobile) {
    percentageLeft = (totalPages - currentPageIndex + 1) / totalPages;
  } else {
    percentageLeft = (totalSpreads - currentSpreadIndex + 1) / totalSpreads;
  }
  
  const widthVal = Math.max(1, percentageLeft * (isMobile ? 5 : 10));
  thickness.style.width = `${widthVal}px`;
}

// Keyboard arrow controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    turnPage(1);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    turnPage(-1);
  }
});

// Scroll intercept controls
let lastScrollTime = 0;
window.addEventListener('wheel', (e) => {
  const currentTime = new Date().getTime();
  if (currentTime - lastScrollTime < 1400) return;
  
  if (e.deltaY > 15) {
    turnPage(1);
    lastScrollTime = currentTime;
  } else if (e.deltaY < -15) {
    turnPage(-1);
    lastScrollTime = currentTime;
  }
});

// Swipe controls
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  isSwiping = true;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isSwiping) return;
  
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const diffX = touchStartX - currentX;
  const diffY = touchStartY - currentY;
  
  // Prevent default scrolling to handle page turns via vertical touch movement (scroll down/up)
  if (Math.abs(diffY) > Math.abs(diffX)) {
    if (e.cancelable) {
      e.preventDefault();
    }
  }
}, { passive: false });

window.addEventListener('touchend', (e) => {
  if (!isSwiping) return;
  isSwiping = false;
  
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;
  
  // Trigger page turns on vertical touch drag (scroll down -> turn next, scroll up -> turn prev)
  if (Math.abs(diffY) > 40 && Math.abs(diffY) > Math.abs(diffX)) {
    if (diffY > 40) {
      turnPage(1);  // Swipe up / Scroll down -> Next page
    } else {
      turnPage(-1); // Swipe down / Scroll up -> Prev page
    }
  }
}, { passive: true });

// Initialize z-indices, buttons, and stack thickness dynamically on load
updatePageZIndices();
updateNavigationButtons();
updatePaperThickness();
initAutoplay();

// Arrow Click Listeners
document.getElementById('prev-btn').addEventListener('click', () => turnPage(-1));
document.getElementById('next-btn').addEventListener('click', () => turnPage(1));

// Reset state on window resize (since booklet widths changes page alignment math)
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const currentWidth = window.innerWidth;
    const wasMobile = isMobile;
    isMobile = currentWidth < 768;
    
    if (wasMobile !== isMobile) {
      window.location.reload();
    }
  }, 400);
});

/* ==========================================
   Music Player (Gramophone)
   ========================================== */

function playBgMusic() {
  if (hasStartedBgMusic || isLocked) return;
  bgMusic.play().then(() => {
    isPlayingMusic = true;
    hasStartedBgMusic = true;
    if (musicPlayer) musicPlayer.classList.add('playing');
    startSpawningNotes();
  }).catch(err => {
    console.log("Autoplay blocked by browser. Music will start on user interaction.");
  });
}

function initAutoplay() {
  playBgMusic();
  const startMusicOnInteraction = () => {
    if (!hasStartedBgMusic) {
      playBgMusic();
    }
    if (hasStartedBgMusic) {
      document.removeEventListener('click', startMusicOnInteraction);
      document.removeEventListener('wheel', startMusicOnInteraction, { passive: true });
      document.removeEventListener('touchstart', startMusicOnInteraction, { passive: true });
    }
  };
  document.addEventListener('click', startMusicOnInteraction);
  document.addEventListener('wheel', startMusicOnInteraction, { passive: true });
  document.addEventListener('touchstart', startMusicOnInteraction, { passive: true });
}

function toggleMusic() {
  if (isPlayingMusic) {
    bgMusic.pause();
    isPlayingMusic = false;
    hasStartedBgMusic = false;
    if (musicPlayer) musicPlayer.classList.remove('playing');
    clearInterval(notesInterval);
  } else {
    // If playing player song (page 28), pause it first
    if (isPlayingPlayerSong) {
      const playerSong = document.getElementById('player-song');
      if (playerSong) {
        playerSong.pause();
        isPlayingPlayerSong = false;
      }
    }
    bgMusic.play().then(() => {
      isPlayingMusic = true;
      hasStartedBgMusic = true;
      if (musicPlayer) musicPlayer.classList.add('playing');
      startSpawningNotes();
    }).catch(() => {
      console.log("Audio block context waiting for user event.");
    });
  }
}

if (musicPlayer) {
  musicPlayer.addEventListener('click', toggleMusic);
}

function startSpawningNotes() {
  clearInterval(notesInterval);
  notesInterval = setInterval(() => {
    if (!isPlayingMusic) return;
    
    // Floating Heart animations out of the gramophone
    if (musicPlayer) {
      const heartDiv = document.createElement('div');
      heartDiv.className = 'floating-heart-gramophone';
      
      const heartIcons = ['❤️'];
      heartDiv.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];
      
      const drift = `${Math.random() * 50 - 25}px`;
      const rot = `${Math.random() * 40 - 20}deg`;
      heartDiv.style.setProperty('--drift', drift);
      heartDiv.style.setProperty('--rot', rot);
      
      heartDiv.style.fontSize = `${Math.random() * 12 + 12}px`;
      heartDiv.style.color = ['#ff4d6d', '#ff758f', '#ff85a1', '#f72585'][Math.floor(Math.random() * 4)];
      heartDiv.style.right = '10px';
      heartDiv.style.top = '0px';
      
      musicPlayer.appendChild(heartDiv);
      setTimeout(() => { heartDiv.remove(); }, 2500);
    }
  }, 500);
}

// Track seek bar time update
bgMusic.addEventListener('timeupdate', () => {
  const progressFill = document.getElementById('music-progress-fill');
  const currentTimeLabel = document.querySelector('.start-time');
  
  if (bgMusic.duration) {
    const percent = (bgMusic.currentTime / bgMusic.duration) * 100;
    if (progressFill) progressFill.style.width = `${percent}%`;
    
    const minutes = Math.floor(bgMusic.currentTime / 60);
    const seconds = Math.floor(bgMusic.currentTime % 60).toString().padStart(2, '0');
    if (currentTimeLabel) currentTimeLabel.textContent = `${minutes}:${seconds}`;
  }
});

// Custom Page 9 Playback Bar click interaction
const oldPlayerPlayBtn = document.getElementById('player-play-btn');
if (oldPlayerPlayBtn) {
  oldPlayerPlayBtn.addEventListener('click', toggleMusic);
}

// Loop toggle button
const oldLoopBtn = document.getElementById('player-loop-btn');
if (oldLoopBtn) {
  oldLoopBtn.addEventListener('click', () => {
    bgMusic.loop = !bgMusic.loop;
    oldLoopBtn.classList.toggle('looping-active', bgMusic.loop);
  });
}

/* ==========================================
   Ambient Elements Generator
   ========================================== */
function spawnAmbientElements() {
  const petalsContainer = document.getElementById('petals-container');
  const heartsContainer = document.getElementById('hearts-container');
  
  for (let i = 0; i < 15; i++) {
    createPetal(petalsContainer, true);
  }
  
  setInterval(() => {
    if (document.querySelectorAll('.petal').length < 25) {
      createPetal(petalsContainer, false);
    }
  }, 1500);

  setInterval(() => {
    if (document.querySelectorAll('.ambient-heart').length < 15) {
      createHeart(heartsContainer);
    }
  }, 2500);
}

function createPetal(container, startRandomly) {
  const petal = document.createElement('div');
  petal.className = `petal ${Math.random() > 0.5 ? 'petal-alternate' : ''}`;
  const size = Math.random() * 12 + 8;
  petal.style.width = `${size}px`;
  petal.style.height = `${size}px`;
  petal.style.left = `${Math.random() * 100}vw`;
  
  const duration = Math.random() * 6 + 7;
  petal.style.animationDuration = `${duration}s`;
  const delay = startRandomly ? -Math.random() * duration : 0;
  petal.style.animationDelay = `${delay}s`;
  
  container.appendChild(petal);
  setTimeout(() => { petal.remove(); }, (duration + delay) * 1000);
}

function createHeart(container) {
  const heart = document.createElement('div');
  heart.className = 'ambient-heart';
  heart.innerHTML = '❤️';
  heart.style.left = `${Math.random() * 90 + 5}vw`;
  const duration = Math.random() * 5 + 8;
  heart.style.animationDuration = `${duration}s`;
  container.appendChild(heart);
  setTimeout(() => { heart.remove(); }, duration * 1000);
}

spawnAmbientElements();

/* ==========================================
   Page Interactive Items
   ========================================== */

// Page 7: Wishlist Slots reasons display
const wishlistSlots = document.querySelectorAll('.wishlist-slot');
const wishlistFeedback = document.getElementById('wishlist-feedback');

wishlistSlots.forEach(slot => {
  slot.addEventListener('click', () => {
    const reasonText = slot.getAttribute('data-reason');
    wishlistFeedback.textContent = reasonText;
    wishlistFeedback.style.animation = 'none';
    void wishlistFeedback.offsetWidth; // trigger reflow
    wishlistFeedback.style.animation = 'breathe-glow 0.8s ease';
    
    // Tiny click sound
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 523.25; // C5 pitch
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch(e) {}
  });
});

/* ==========================================
   Valentine Coupons Redemption System
   ========================================== */
const couponTickets = document.querySelectorAll('.coupon-hotspot');
const couponModal = document.getElementById('coupon-modal');
const couponSelectedTitle = document.getElementById('coupon-selected-title');
const couponCreditSubmit = document.getElementById('coupon-credit-submit');
const couponEmailInput = document.getElementById('coupon-email');
const dispatcherSteps = document.getElementById('dispatcher-steps');
const successModal = document.getElementById('success-modal');

let activeCouponTitle = "";

couponTickets.forEach(ticket => {
  ticket.addEventListener('click', () => {
    activeCouponTitle = ticket.getAttribute('data-title');
    couponSelectedTitle.textContent = activeCouponTitle;
    
    // Reset Modal Box visibility states
    document.querySelector('.coupon-input-group').style.display = 'flex';
    document.getElementById('coupon-modal-close').style.display = 'block';
    dispatcherSteps.style.display = 'none';
    
    // Reset dispatcher step highlights
    document.getElementById('dispatch-step-1').className = 'dispatch-step';
    document.getElementById('dispatch-step-2').className = 'dispatch-step';
    document.getElementById('dispatch-step-3').className = 'dispatch-step';
    
    couponModal.classList.add('active-popup');
    
    // Play button click tick
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 600;
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch(e) {}
  });
});

// Close Coupon Modal
document.getElementById('coupon-modal-close').addEventListener('click', closeCouponPopup);
document.getElementById('coupon-modal-overlay').addEventListener('click', closeCouponPopup);

function closeCouponPopup() {
  couponModal.classList.remove('active-popup');
}

// Click Claim / Credit button
couponCreditSubmit.addEventListener('click', () => {
  const recipientEmail = couponEmailInput.value.trim();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    alert("Please enter a valid email address!");
    return;
  }
  
  // Start automated dispatcher simulated loading
  document.querySelector('.coupon-input-group').style.display = 'none';
  document.getElementById('coupon-modal-close').style.display = 'none'; // Lock exit during sending
  dispatcherSteps.style.display = 'flex';
  
  const step1 = document.getElementById('dispatch-step-1');
  const step2 = document.getElementById('dispatch-step-2');
  const step3 = document.getElementById('dispatch-step-3');
  
  // Step 1: Active
  step1.classList.add('step-active');
  
  setTimeout(() => {
    step1.classList.remove('step-active');
    step1.classList.add('step-done');
    step2.classList.add('step-active');
    
    setTimeout(() => {
      step2.classList.remove('step-active');
      step2.classList.add('step-done');
      step3.classList.add('step-active');
      
      setTimeout(() => {
        step3.classList.remove('step-active');
        step3.classList.add('step-done');
        
        // Hide claim modal and open Success Popup, and send automated email in the background
        setTimeout(() => {
          closeCouponPopup();
          successModal.classList.add('active-popup');
          
          // Send email automatically without mailto / user intervention
          fetch('/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: recipientEmail,
              coupon: activeCouponTitle
            })
          })
          .then(res => res.json())
          .then(data => {
            console.log("Automatic email server response:", data);
          })
          .catch(err => {
            console.error("Failed to send automatic email:", err);
          });
        }, 300);
        
      }, 700);
    }, 700);
  }, 700);
});

// Success Modal Close handlers
document.getElementById('success-close-btn').addEventListener('click', closeSuccessPopup);
document.getElementById('success-modal-overlay-close').addEventListener('click', closeSuccessPopup);

function closeSuccessPopup() {
  successModal.classList.remove('active-popup');
}

/* ==========================================
   Closing Sequence (Closing Book & Outro)
   ========================================== */
const finalCloseTrigger = document.getElementById('final-close-trigger');
const outroScreen = document.getElementById('outro-screen');
const restartBtn = document.getElementById('restart-btn');

if (finalCloseTrigger) {
  finalCloseTrigger.addEventListener('click', () => {
    closeDiaryAndShowCredits();
  });
}

function closeDiaryAndShowCredits() {
  if (isTurningPage) return;
  isTurningPage = true;

  // Hide arrows & swipe hints
  const navArrows = document.querySelector('.page-navigation-arrows');
  if (navArrows) navArrows.style.display = 'none';
  
  const scrollHint = document.getElementById('scroll-down-hint') || document.getElementById('swipe-hint');
  if (scrollHint) {
    scrollHint.style.opacity = '0';
    scrollHint.style.pointerEvents = 'none';
  }

  let delay = 0;
  
  if (isMobile) {
    // Reverse mobile sequential pages
    for (let i = totalPages - 1; i >= 1; i--) {
      setTimeout(() => {
        const page = document.getElementById(`page-${i}`);
        page.classList.remove('flipped');
        playPageTurnSound();
        
        currentPageIndex = i;
        updatePageZIndices();
        updatePaperThickness();
        
        if (i === 1) {
          const diaryContainer = document.getElementById('diary-container');
          diaryContainer.classList.add('closed-book');
          
          setTimeout(() => {
            outroScreen.classList.add('active-outro');
            generateOutroSparkles();
            fadeMusicOut();
            startTypewriterOutroSequence();
            isTurningPage = false;
          }, 1200);
        }
      }, delay);
      delay += 180;
    }
  } else {
    // Reverse desktop spreads
    for (let i = totalSpreads - 1; i >= 1; i--) {
      setTimeout(() => {
        const rightPage = document.getElementById(`page-${2 * i - 1}`);
        const leftPage = document.getElementById(`page-${2 * i}`);
        
        if (rightPage) rightPage.classList.remove('flipped-right');
        if (leftPage) leftPage.classList.remove('active-left');
        
        playPageTurnSound();
        
        currentSpreadIndex = i;
        updatePageZIndices();
        updatePaperThickness();
        
        if (i === 1) {
          const diaryContainer = document.getElementById('diary-container');
          diaryContainer.classList.add('closed-book');
          
          setTimeout(() => {
            outroScreen.classList.add('active-outro');
            generateOutroSparkles();
            fadeMusicOut();
            startTypewriterOutroSequence();
            isTurningPage = false;
          }, 1200);
        }
      }, delay);
      delay += 220;
    }
  }
}

function fadeMusicOut() {
  const fadeAudioInterval = setInterval(() => {
    if (bgMusic.volume > 0.05) {
      bgMusic.volume -= 0.05;
    } else {
      bgMusic.pause();
      clearInterval(fadeAudioInterval);
    }
  }, 150);
}

// Outro Typewriter Text Sequences
function startTypewriterOutroSequence() {
  const line1 = document.getElementById('typewriter-line-1');
  const line2 = document.getElementById('typewriter-line-2');
  const rstBtn = document.getElementById('restart-btn');
  
  // Reset clean slate
  line1.innerHTML = "";
  line2.innerHTML = "";
  line1.className = "typewriter-line";
  line2.className = "typewriter-line highlight-anniversary";
  rstBtn.style.opacity = "0";
  rstBtn.style.pointerEvents = "none";
  
  const text1 = "I LOVE YOU SO MUCH PANKAJ";
  const text2 = "happy anniversary once again..cheers to 1 year and many more to come";
  
  // Type Line 1
  typeText(line1, text1, 70, () => {
    // Done typing line 1: pause 600ms, then start Line 2
    setTimeout(() => {
      line1.classList.remove('typing-active');
      typeText(line2, text2, 60, () => {
        // Done typing line 2
        setTimeout(() => {
          line2.classList.remove('typing-active');
          rstBtn.style.transition = "opacity 0.8s ease";
          rstBtn.style.opacity = "1";
          rstBtn.style.pointerEvents = "all";
        }, 400);
      });
    }, 600);
  });
}

function typeText(element, text, speed, onComplete) {
  element.classList.add('typing-active');
  let index = 0;
  
  function typeChar() {
    if (index < text.length) {
      element.innerHTML += text.charAt(index);
      index++;
      setTimeout(typeChar, speed);
    } else {
      if (onComplete) onComplete();
    }
  }
  typeChar();
}

function generateOutroSparkles() {
  const container = document.getElementById('outro-particles');
  container.innerHTML = '';
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      if (!outroScreen.classList.contains('active-outro')) return;
      createOutroSparkle(container);
    }, i * 150);
  }
}

function createOutroSparkle(container) {
  const sparkle = document.createElement('div');
  sparkle.className = 'outro-sparkle';
  const isHeart = Math.random() > 0.4;
  sparkle.innerHTML = isHeart ? '❤️' : '✨';
  sparkle.style.color = isHeart ? 'var(--rose-pink)' : 'var(--muted-gold)';
  sparkle.style.fontSize = `${Math.random() * 16 + 10}px`;
  sparkle.style.left = `${Math.random() * 100}vw`;
  const duration = Math.random() * 4 + 5;
  sparkle.style.animationDuration = `${duration}s`;
  container.appendChild(sparkle);
  setTimeout(() => { sparkle.remove(); }, duration * 1000);
}

// Restart button
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    outroScreen.classList.remove('active-outro');
    
    // Clear lines
    document.getElementById('typewriter-line-1').innerHTML = "";
    document.getElementById('typewriter-line-2').innerHTML = "";
    
    currentPageIndex = 1;
    currentSpreadIndex = 1;
    
    document.querySelector('.page-navigation-arrows').style.display = 'flex';
    
    // Unflip all pages
    const allPages = document.querySelectorAll('.diary-page');
    allPages.forEach(page => {
      page.classList.remove('flipped', 'flipped-right', 'active-left');
    });
    
    updatePageZIndices();
    updateNavigationButtons();
    updatePaperThickness();
    
    const diaryContainer = document.getElementById('diary-container');
    if (!isMobile) {
      diaryContainer.classList.add('closed-book');
    }
    
    bgMusic.volume = 1.0;
    if (isPlayingMusic) {
      bgMusic.play();
    }
  });
}

/* ==========================================
   Memory Polaroid Grid Popup System
   ========================================== */
const memoryHotspots = document.querySelectorAll('.memory-hotspot');
const memoryModal = document.getElementById('memory-modal');
const memoryModalZoomedImg = document.getElementById('memory-modal-zoomed-img');
const memoryModalText = document.getElementById('memory-modal-text');
const memoryModalClose = document.getElementById('memory-modal-close');
const memoryModalOverlay = document.getElementById('memory-modal-overlay');

const memoryMessages = {
  1: "The wrinkle around your eyes when you laugh makes me smile every time. ❤️",
  2: "Always saving the last slice of pizza for me, because you know how much I love it! 🍕",
  3: "Stupid inside jokes that make zero sense to anyone else, but make us laugh to tears. 😂",
  4: "Your cozy warm hugs on freezing nights are the best place in the world. 🧸",
  5: "Always letting me pick the movie, even when you know it's going to be a cheesy romance. 🎬",
  6: "Your dedication to terrible singing in the shower that always brightens my day. 🎤",
  7: "Making ordinary days feel magical, just by holding my hand and being you. ✨",
  8: "Because you're my absolute home. No matter where we are, as long as I am with you. 🏡"
};

const memoryBackgroundPositions = {
  1: '0% 0%',
  2: '50% 0%',
  3: '100% 0%',
  4: '0% 50%',
  5: '100% 50%',
  6: '0% 100%',
  7: '50% 100%',
  8: '100% 100%'
};

let memoryTypewriterTimeout = null;

function runMemoryTypewriter(element, text, speed) {
  clearTimeout(memoryTypewriterTimeout);
  element.textContent = "";
  element.classList.add('typing-active');
  let idx = 0;
  function type() {
    if (idx < text.length) {
      element.textContent += text.charAt(idx);
      idx++;
      memoryTypewriterTimeout = setTimeout(type, speed);
    } else {
      element.classList.remove('typing-active');
    }
  }
  type();
}

memoryHotspots.forEach(hotspot => {
  hotspot.addEventListener('click', () => {
    const idx = hotspot.getAttribute('data-index');
    
    // Set position to zoom in on clicked polaroid
    const pos = memoryBackgroundPositions[idx];
    if (pos) {
      memoryModalZoomedImg.style.backgroundPosition = pos;
    }
    
    // Open popup
    memoryModal.classList.add('active-popup');
    
    // Start typewriter text
    const msg = memoryMessages[idx] || "";
    runMemoryTypewriter(memoryModalText, msg, 40);
    
    // Tiny click sound
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 523.25;
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch(e) {}
  });
});

if (memoryModalClose) {
  memoryModalClose.addEventListener('click', closeMemoryPopup);
}
if (memoryModalOverlay) {
  memoryModalOverlay.addEventListener('click', closeMemoryPopup);
}

function closeMemoryPopup() {
  clearTimeout(memoryTypewriterTimeout);
  if (memoryModal) {
    memoryModal.classList.remove('active-popup');
  }
}

/* ==========================================
   New Music Player Playback Controls (Page 10)
   ========================================== */
const newPlayerPlayBtn = document.getElementById('new-player-play-btn');
const playerSong = document.getElementById('player-song');

if (newPlayerPlayBtn && playerSong) {
  newPlayerPlayBtn.addEventListener('click', () => {
    if (isPlayingPlayerSong) {
      playerSong.pause();
      isPlayingPlayerSong = false;
    } else {
      // Pause background music if playing
      if (isPlayingMusic) {
        toggleMusic(); // pauses background music and updates gramophone state
      }
      playerSong.play().then(() => {
        isPlayingPlayerSong = true;
      }).catch(err => {
        console.error("Audio context blocked player-song play.", err);
      });
    }
  });
}

/* ==========================================
   Anniversary Lock Screen & Countdown Controller
   ========================================== */

(function initLockScreen() {
  const lockScreenOverlay = document.getElementById('lock-screen');
  const lockCard = lockScreenOverlay ? lockScreenOverlay.querySelector('.lock-card') : null;
  const passwordInput = document.getElementById('lock-password');
  const submitBtn = document.getElementById('lock-submit-btn');
  const errorMsg = document.getElementById('lock-error-msg');
  
  const timerDays = document.getElementById('timer-days');
  const timerHours = document.getElementById('timer-hours');
  const timerMinutes = document.getElementById('timer-minutes');
  const timerSeconds = document.getElementById('timer-seconds');
  
  const hintBtn = document.getElementById('lock-hint-btn');
  const hintBox = document.getElementById('lock-hint-box');
  const hintText = document.getElementById('lock-hint-text');
  const nextHintBtn = document.getElementById('lock-next-hint-btn');
  
  // Countdown to July 21st, 2026
  const targetDate = new Date('2026-07-21T00:00:00');
  const correctPasswordHash = "21986e3236f1df3d75ba5171929fb2c9b19191132b6be578b4980884e2e363de";
  
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  
  const hints = [
    "Her absolute favorite Hollywood actor (in ALL CAPS) followed by special characters @#.",
    "High School Musical star...",
    "Starts with 'ZAC' and ends with '@#'."
  ];
  let currentHintIndex = 0;
  
  // 2. Countdown Timer & Unlock Functions (Declared first to avoid Temporal Dead Zone)
  let countdownInterval = null;
  
  function updateCountdown() {
    const now = new Date();
    const difference = targetDate - now;
    
    if (difference <= 0) {
      clearInterval(countdownInterval);
      unlockDiary(false); // Auto-unlock when target date is reached
      return;
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    if (timerDays) timerDays.textContent = String(days).padStart(2, '0');
    if (timerHours) timerHours.textContent = String(hours).padStart(2, '0');
    if (timerMinutes) timerMinutes.textContent = String(minutes).padStart(2, '0');
    if (timerSeconds) timerSeconds.textContent = String(seconds).padStart(2, '0');
  }

  function startCountdown() {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }
  
  function unlockDiary(instant = false) {
    clearInterval(countdownInterval);
    isLocked = false;
    
    if (instant) {
      if (lockScreenOverlay) {
        lockScreenOverlay.style.display = 'none';
      }
    } else {
      // Play tactile seal crack sound effect
      if (typeof playSealCrackSound === 'function') {
        playSealCrackSound();
      }
      
      if (lockScreenOverlay) {
        lockScreenOverlay.classList.add('fade-out');
        setTimeout(() => {
          lockScreenOverlay.style.display = 'none';
        }, 1000);
      }
      
      // Start background music now that page is unlocked and user interacted
      if (typeof playBgMusic === 'function') {
        playBgMusic();
      }
    }
  }

  // 1. Initial State Check (Locked by default until July 21st, 2026 unless password entered)
  const isCountdownOver = new Date() >= targetDate;
  
  if (isCountdownOver) {
    unlockDiary(true); // Instant unlock
  } else {
    // Show lock screen (managed by style.css having default display flex)
    if (lockScreenOverlay) {
      lockScreenOverlay.style.display = 'flex';
    }
    isLocked = true;
    startCountdown();
  }
  
  // 4. Password Submission Handler
  async function attemptUnlock() {
    if (!passwordInput) return;
    const inputVal = passwordInput.value.trim();
    const inputHash = await sha256(inputVal);
    
    if (inputHash === correctPasswordHash) {
      unlockDiary(false);
    } else {
      // Clear input and show error message
      passwordInput.value = '';
      if (errorMsg) {
        errorMsg.textContent = "Oops! That's not the key to my heart. Try again!";
      }
      
      // Trigger card shake animation
      if (lockCard) {
        lockCard.classList.remove('shake-animation');
        void lockCard.offsetWidth; // trigger reflow
        lockCard.classList.add('shake-animation');
        
        setTimeout(() => {
          lockCard.classList.remove('shake-animation');
        }, 500);
      }
    }
  }
  
  if (submitBtn) {
    submitBtn.addEventListener('click', attemptUnlock);
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        attemptUnlock();
      }
    });
  }
  
  // 5. Interactive Hints Logic
  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      if (hintBox) {
        if (hintBox.style.display === 'none') {
          currentHintIndex = 0;
          if (hintText) hintText.textContent = hints[currentHintIndex];
          hintBox.style.display = 'flex';
          hintBtn.textContent = 'Hide Hint';
          if (nextHintBtn) nextHintBtn.style.display = 'block';
        } else {
          hintBox.style.display = 'none';
          hintBtn.textContent = 'Need a hint?';
        }
      }
    });
  }
  
  if (nextHintBtn) {
    nextHintBtn.addEventListener('click', () => {
      currentHintIndex = (currentHintIndex + 1) % hints.length;
      if (hintText) {
        hintText.textContent = hints[currentHintIndex];
      }
    });
  }
})();



