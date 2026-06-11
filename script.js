/* ============================================================
   个人主页 — 交互脚本（优化版）
   核心技术：GSAP + ScrollTrigger + Firebase
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ========== 工具函数 ==========
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ========== 注册 GSAP ScrollTrigger ==========
  gsap.registerPlugin(ScrollTrigger);

  // ==========================================================
  //  1. 导航栏 — 首屏透明，滚动后显示背景
  // ==========================================================
  const nav = $('#nav');

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'bottom-=80px top',
    end: 'bottom top',
    onLeave: () => nav.classList.add('visible'),
    onEnterBack: () => nav.classList.remove('visible'),
  });

  // ==========================================================
  //  2. 侧边导航点 + 导航栏高亮
  // ==========================================================
  const dots = $$('#sideDots .dot');
  const navLinks = $$('.nav-link');
  const sectionMap = { hero: null, about: null, thoughts: null, notes: null, contact: null };
  const sections = ['hero', 'about', 'thoughts', 'notes', 'contact']
    .map(id => { sectionMap[id] = $('#' + id); return sectionMap[id]; })
    .filter(Boolean);

  function updateSideDots() {
    const scrollY = window.scrollY + window.innerHeight / 2;
    let current = 'hero';

    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top + window.scrollY;
      if (scrollY >= top) current = sec.id;
    });

    dots.forEach(d => d.classList.toggle('active', d.dataset.target === current));

    // ⑥ 导航栏高亮
    navLinks.forEach(link => {
      const href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === current);
    });
  }

  window.addEventListener('scroll', updateSideDots, { passive: true });

  // ==========================================================
  //  3. 首屏 — 入场动画 + 光晕跟随
  // ==========================================================
  const heroContent = $('.hero-content');
  const scrollHint = $('#scrollHint');
  const heroGlow = $('#heroGlow');
  const hero = $('#hero');

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to(heroContent, { opacity: 1, duration: 0.8 })
    .to(scrollHint, { opacity: 1, duration: 0.6 }, '-=0.2');

  // 光晕跟随鼠标（带阻尼）
  let glowX = window.innerWidth / 2;
  let glowY = window.innerHeight / 2;
  let currentX = glowX;
  let currentY = glowY;

  hero.addEventListener('mousemove', (e) => { glowX = e.clientX; glowY = e.clientY; });

  function animateGlow() {
    currentX += (glowX - currentX) * 0.05;
    currentY += (glowY - currentY) * 0.05;
    heroGlow.style.left = currentX + 'px';
    heroGlow.style.top = currentY + 'px';
    requestAnimationFrame(animateGlow);
  }
  heroGlow.style.left = '50%';
  heroGlow.style.top = '50%';
  animateGlow();

  // ==========================================================
  //  4. 关于区 — 兴趣标签交互
  // ==========================================================
  const interestData = {
    game: {
      icon: '🎮', name: '游戏',
      items: [
        { label: '最近在玩', value: '洛克王国世界' },
        { label: '最喜欢的类型', value: '模拟经营、角色扮演' },
        { label: '游戏年龄', value: '生理年龄减 7 年' },
      ]
    },
    music: {
      icon: '🎵', name: '音乐',
      items: [
        { label: '本月已听', value: '241 首' },
        { label: '五月听歌', value: '861 首' },
        { label: '最近单曲循环', value: 'Blue Sky, Blue Star' },
        { label: '常用平台', value: 'QQ 音乐' },
      ]
    },
    film: {
      icon: '🎬', name: '影视',
      items: [
        { label: '最近看过的好片', value: '《给阿嬷的情书》《挽救计划》' },
        { label: '最爱类型', value: '杂食类，除了喜剧' },
      ]
    },
    anime: {
      icon: '📺', name: '动漫',
      items: [
        { label: '追番数量', value: '数不清咯' },
        { label: '最近在追', value: '《正相反的你和我》' },
        { label: '推荐', value: '《末日后酒店》（都给我去看！）' },
      ]
    }
  };

  const tags = $$('#tagsRow .tag');
  const dataPanel = $('#dataPanel');
  const dataPanelInner = $('#dataPanelInner');
  let activeInterest = null;

  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      const key = tag.dataset.interest;
      if (activeInterest === key && dataPanel.classList.contains('open')) {
        closeDataPanel();
        return;
      }
      activeInterest = key;
      const data = interestData[key];
      if (!data) return;

      dataPanelInner.innerHTML = `
        <div class="data-panel-header">${data.icon} ${data.name}</div>
        ${data.items.map(item => `
          <div class="data-item"><strong>${item.label}</strong>：${item.value}</div>
        `).join('')}
      `;
      dataPanel.classList.add('open');
      tags.forEach(t => t.classList.toggle('active', t.dataset.interest === key));
    });
  });

  document.addEventListener('click', (e) => {
    if (dataPanel.classList.contains('open') &&
        !dataPanel.contains(e.target) &&
        !e.target.closest('.tag')) {
      closeDataPanel();
    }
  });

  function closeDataPanel() {
    dataPanel.classList.remove('open');
    activeInterest = null;
    tags.forEach(t => t.classList.remove('active'));
  }

  // ==========================================================
  //  5. 思考区 — 横向翻阅 ⭐（含移动端降级 + 聚光灯）
  // ==========================================================
  const thoughtsSection = $('#thoughts');
  const thoughtsTrack = $('#thoughtsTrack');
  const thoughtsTitle = $('#thoughtsTitle');
  const thoughtsDots = $('#thoughtsDots');
  const thoughtsCounter = $('#thoughtsCounter');
  const arrowLeft = $('#thoughtsArrowLeft');
  const arrowRight = $('#thoughtsArrowRight');
  const thoughtsNavBar = $('.thoughts-nav');

  const cards = $$('.thought-card', thoughtsTrack);
  const totalCards = cards.length;
  let currentCardIndex = 0;
  let thoughtST = null;
  let isMobileThoughts = false;

  function getMetrics() {
    if (cards.length === 0) return { cardW: 320, gap: 24, totalW: 0, scrollDist: 0 };
    const cardW = cards[0].offsetWidth;
    const gap = 24;
    const totalW = totalCards * (cardW + gap) - gap;
    const scrollDist = Math.max(0, totalW - cardW);
    return { cardW, gap, totalW, scrollDist };
  }

  function createThoughtScroll() {
    if (thoughtST) { thoughtST.kill(); thoughtST = null; }

    // ① 手机端降级：跳过横向翻阅
    if (window.innerWidth < 640) {
      isMobileThoughts = true;
      gsap.set(thoughtsTrack, { x: 0, clearProps: 'paddingLeft,paddingRight' });
      thoughtsTrack.style.paddingLeft = '';
      thoughtsTrack.style.paddingRight = '';
      if (thoughtsNavBar) thoughtsNavBar.style.display = 'none';
      // 显示标题并保持可见
      gsap.set(thoughtsTitle, { opacity: 1 });
      // 卡片重置样式
      cards.forEach(c => gsap.set(c, { opacity: 1, scale: 1, clearProps: 'opacity,scale' }));
      // 竖直排列
      thoughtsTrack.style.flexWrap = 'wrap';
      thoughtsTrack.style.justifyContent = 'center';
      return;
    }

    isMobileThoughts = false;
    thoughtsTrack.style.flexWrap = '';
    thoughtsTrack.style.justifyContent = '';
    if (thoughtsNavBar) thoughtsNavBar.style.display = '';

    const { scrollDist, cardW } = getMetrics();
    if (scrollDist <= 0) return;

    gsap.set(thoughtsTrack, { x: 0 });
    const sidePad = (window.innerWidth - cardW) / 2;
    thoughtsTrack.style.paddingLeft = sidePad + 'px';
    thoughtsTrack.style.paddingRight = sidePad + 'px';

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: thoughtsSection,
        start: 'top top',
        end: `+=${scrollDist + window.innerHeight * 0.6}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          const rawIndex = progress * (totalCards - 1);
          const idx = Math.min(totalCards - 1, Math.round(rawIndex));
          if (idx !== currentCardIndex) {
            currentCardIndex = idx;
            updateThoughtNav();
          }
          // ⑧ 聚光灯效果
          updateSpotlight(progress);
        },
        onEnter: () => {
          gsap.to(thoughtsTitle, { opacity: 1, duration: 0.4 });
          updateSpotlight(0);
        },
      }
    });

    tl.to(thoughtsTrack, { x: -scrollDist, ease: 'none' });
    thoughtST = tl.scrollTrigger;
  }

  // ⑧ 聚光灯：中间卡片亮，两边暗
  function updateSpotlight(progress) {
    if (isMobileThoughts) return;
    cards.forEach((card, i) => {
      const cardProgress = i / Math.max(1, totalCards - 1);
      const distance = Math.abs(progress - cardProgress) / (1 / Math.max(1, totalCards - 1));
      const dimmed = distance > 0.6;
      card.classList.toggle('dimmed', dimmed);
    });
  }

  function updateThoughtNav() {
    const tDots = $$('.t-dot', thoughtsDots);
    tDots.forEach((d, i) => d.classList.toggle('active', i === currentCardIndex));
    thoughtsCounter.textContent = `${currentCardIndex + 1} / ${totalCards}`;
    arrowLeft.classList.toggle('hidden', currentCardIndex === 0);
    arrowRight.classList.toggle('hidden', currentCardIndex === totalCards - 1);
  }

  arrowRight.addEventListener('click', () => {
    if (currentCardIndex < totalCards - 1) { currentCardIndex++; scrollToCard(currentCardIndex); }
  });
  arrowLeft.addEventListener('click', () => {
    if (currentCardIndex > 0) { currentCardIndex--; scrollToCard(currentCardIndex); }
  });
  thoughtsDots.addEventListener('click', (e) => {
    const dot = e.target.closest('.t-dot');
    if (!dot) return;
    const idx = [...thoughtsDots.children].indexOf(dot);
    if (idx >= 0 && idx < totalCards) { currentCardIndex = idx; scrollToCard(idx); }
  });

  function scrollToCard(index) {
    if (!thoughtST) return;
    const progress = totalCards > 1 ? index / (totalCards - 1) : 0;
    const start = thoughtST.start;
    const end = thoughtST.end;
    window.scrollTo({ top: start + progress * (end - start), behavior: 'smooth' });
  }

  createThoughtScroll();
  updateThoughtNav();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
      createThoughtScroll();
      updateThoughtNav();
    }, 300);
  });

  // ==========================================================
  //  6. 手记区 — 分类筛选（含自动滚动 + 计数 + 悬浮）
  // ==========================================================
  const filterBtns = $$('.filter-bar .filter-btn');
  const noteCards = $$('#masonry .note-card');
  const filterBar = $('.filter-bar');
  const notesSection = $('#notes');
  let activeFilter = 'all';

  // ④-C 筛选条悬浮
  if (window.innerWidth <= 640) {
    notesSection.classList.add('filter-bar-sticky');
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      if (filter === activeFilter) return;
      activeFilter = filter;

      filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));

      const toHide = [];
      const toShow = [];

      noteCards.forEach(card => {
        const cat = card.dataset.category;
        if (filter === 'all' || cat === filter) {
          toShow.push(card);
        } else {
          toHide.push(card);
        }
      });

      // ④-B 显示计数
      showFilterCount(toShow.length);

      // 先隐藏
      toHide.forEach((card, i) => {
        gsap.to(card, {
          opacity: 0, scale: 0.95, duration: 0.25,
          delay: i * 0.03,
          onComplete: () => card.classList.add('hidden'),
        });
      });

      // 再显示 + ④-A 自动滚动
      setTimeout(() => {
        toShow.forEach(card => card.classList.remove('hidden'));
        let firstVisible = null;
        toShow.forEach((card, i) => {
          gsap.fromTo(card,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.35, delay: i * 0.04, ease: 'power2.out' }
          );
          if (i === 0) firstVisible = card;
        });

        // 滚动到第一个匹配卡片
        if (firstVisible) {
          setTimeout(() => {
            const rect = firstVisible.getBoundingClientRect();
            const scrollTop = window.scrollY + rect.top - 120;
            window.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }, 250);
        }
      }, 200);
    });
  });

  // ④-B 筛选计数
  let countTimeout;
  function showFilterCount(count) {
    let countEl = $('.filter-count');
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.className = 'filter-count';
      filterBar.appendChild(countEl);
    }
    countEl.textContent = `共 ${count} 条`;
    countEl.classList.add('show');
    clearTimeout(countTimeout);
    countTimeout = setTimeout(() => countEl.classList.remove('show'), 1800);
  }

  // ==========================================================
  //  7. 联系区 — 图标行为修正
  // ==========================================================
  const emailIcon = $('#emailIcon');
  const musicIcon = $('#musicIcon');
  const musicToggle = $('#musicToggle');
  const musicPlayer = $('#musicPlayer');
  const footerEl = $('#footer');

  // ⑬ 邮箱：点击复制地址
  emailIcon.addEventListener('click', (e) => {
    e.preventDefault();
    navigator.clipboard.writeText('m17385892518@163.com').then(() => {
      showToast('邮箱地址已复制：m17385892518@163.com');
    }).catch(() => {
      showToast('m17385892518@163.com');
    });
  });

  // ⑬ QQ音乐：滚动到页脚歌单
  musicIcon.addEventListener('click', (e) => {
    e.preventDefault();
    // 先滚动到页脚
    footerEl.scrollIntoView({ behavior: 'smooth' });
    // 延迟后自动展开歌单 + 高亮音符
    setTimeout(() => {
      if (!musicPlayer.classList.contains('open')) {
        musicPlayer.classList.add('open');
        musicToggle.setAttribute('aria-label', '关闭歌单');
      }
      // 音符微亮
      gsap.fromTo(musicToggle,
        { scale: 1 },
        { scale: 1.3, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }
      );
      showToast('在这里 ↓ 听听歌吧');
    }, 600);
  });

  // ==========================================================
  //  8. 页脚 — 三重彩蛋
  // ==========================================================

  // --- 8a. 时间感知问候 ---
  function updateTimeGreeting() {
    const hour = new Date().getHours();
    const el = $('#timeGreeting');
    let greeting;
    if (hour >= 6 && hour < 9) {
      greeting = '☕ 早。这个时间来看我主页，你和我一样起得早。';
    } else if (hour >= 9 && hour < 18) {
      greeting = '🌿 白天的时光，适合慢慢看。';
    } else if (hour >= 18 && hour < 22) {
      greeting = '🌆 傍晚好。这个时候翻主页，是在等人吗？';
    } else {
      greeting = '🌙 这么晚了——我也是夜猫子，握个手。';
    }
    el.textContent = greeting;
  }
  updateTimeGreeting();

  // --- 8b. 隐藏歌单 ---
  const audioPlayer = $('#audioPlayer');
  let currentTrackBtn = null;

  musicToggle.addEventListener('click', () => {
    musicPlayer.classList.toggle('open');
    const isOpen = musicPlayer.classList.contains('open');
    musicToggle.setAttribute('aria-label', isOpen ? '关闭歌单' : '隐藏歌单');
  });

  musicPlayer.addEventListener('click', (e) => {
    const btn = e.target.closest('.track-play');
    if (!btn) return;
    const track = btn.closest('.music-track');
    const src = track.dataset.src;

    if (currentTrackBtn === btn) {
      if (audioPlayer.paused) {
        audioPlayer.play();
        btn.textContent = '⏸';
        btn.classList.add('playing');
      } else {
        audioPlayer.pause();
        btn.textContent = '▶';
        btn.classList.remove('playing');
      }
      return;
    }
    if (currentTrackBtn) {
      currentTrackBtn.textContent = '▶';
      currentTrackBtn.classList.remove('playing');
    }
    audioPlayer.src = src;
    audioPlayer.play().catch(() => {});
    btn.textContent = '⏸';
    btn.classList.add('playing');
    currentTrackBtn = btn;
  });

  audioPlayer.addEventListener('ended', () => {
    if (currentTrackBtn) {
      currentTrackBtn.textContent = '▶';
      currentTrackBtn.classList.remove('playing');
      currentTrackBtn = null;
    }
  });

  // --- 8c. 隐藏一句话 ---
  const footerCopy = $('#footerCopy');
  const copyEaster = $('#copyEaster');
  const originalText = copyEaster.textContent;
  const secretText = ' · 你居然连这里都看了——那我们应该是朋友了。';
  let hoverTimer = null;

  footerCopy.addEventListener('mouseenter', () => {
    hoverTimer = setTimeout(() => {
      gsap.to(copyEaster, {
        opacity: 0, duration: 0.3,
        onComplete: () => {
          copyEaster.textContent = secretText;
          gsap.to(copyEaster, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        }
      });
    }, 1500);
  });

  footerCopy.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    if (copyEaster.textContent === secretText) {
      gsap.to(copyEaster, {
        opacity: 0, duration: 0.3,
        onComplete: () => {
          copyEaster.textContent = originalText;
          gsap.to(copyEaster, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        }
      });
    }
  });

  // ==========================================================
  //  ③ 回到顶部 — 快速倒带效果
  // ==========================================================
  const backToTop = $('#backToTop');

  backToTop.addEventListener('click', () => {
    const currentScroll = window.scrollY;
    if (currentScroll < 100) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 收尾语微微亮
    const msg = $('.footer-message');
    gsap.to(msg, { opacity: 0.5, duration: 0.15, yoyo: true, repeat: 1 });

    // 停顿 → 加速 → 减速
    setTimeout(() => {
      gsap.to(window, {
        scrollTo: 0,
        duration: 1,
        ease: 'power3.inOut',
        onComplete: () => {
          // 名字呼吸动画
          gsap.to('.hero-name', {
            scale: 1.03,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: 'power2.out'
          });
        }
      });
    }, 180);
  });

  // ==========================================================
  //  ⑦ 自定义光标
  // ==========================================================
  let cursorEnabled = true;
  const cursorToggleBtn = $('#cursorToggle');
  let cursorEl = null;

  function createCursor() {
    cursorEl = document.createElement('div');
    cursorEl.className = 'custom-cursor';
    document.body.appendChild(cursorEl);
  }

  function destroyCursor() {
    if (cursorEl) { cursorEl.remove(); cursorEl = null; }
  }

  function updateCursorToggleUI() {
    if (cursorEnabled) {
      cursorToggleBtn.classList.remove('off');
      cursorToggleBtn.innerHTML = '<span class="cursor-toggle-dot"></span> 光标效果：开';
    } else {
      cursorToggleBtn.classList.add('off');
      cursorToggleBtn.innerHTML = '<span class="cursor-toggle-dot"></span> 光标效果：关';
    }
  }

  // 初始化光标（仅非触屏设备）
  if (!('ontouchstart' in window)) {
    createCursor();

    document.addEventListener('mousemove', (e) => {
      if (!cursorEl || !cursorEnabled) return;
      cursorEl.style.left = e.clientX + 'px';
      cursorEl.style.top = e.clientY + 'px';
    });

    // 悬停可交互元素时光标放大
    document.addEventListener('mouseover', (e) => {
      if (!cursorEl || !cursorEnabled) return;
      const target = e.target.closest('a, button, .tag, .note-card, .thought-card, .thought-link, .social-icon, .track-play');
      cursorEl.classList.toggle('hover', !!target);
    });

    document.addEventListener('mouseout', (e) => {
      if (!cursorEl || !cursorEnabled) return;
      const target = e.target.closest('a, button, .tag, .note-card, .thought-card, .thought-link, .social-icon, .track-play');
      if (target) cursorEl.classList.remove('hover');
    });
  }

  cursorToggleBtn.addEventListener('click', () => {
    cursorEnabled = !cursorEnabled;
    updateCursorToggleUI();
    if (!cursorEnabled) {
      destroyCursor();
    } else if (!('ontouchstart' in window)) {
      createCursor();
    }
  });

  updateCursorToggleUI();

  // ==========================================================
  //  ② 区域过渡衔接 — 重叠淡入 + 章节分隔符
  // ==========================================================
  const fadeSections = ['#about', '#notes', '#contact', '#messageWall'];
  fadeSections.forEach(sel => {
    const el = $(sel);
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom-=60px',  // ②-A 提前淡入（重叠）
          toggleActions: 'play none none reverse',
        }
      }
    );
  });

  // ②-B 章节分隔符
  const seps = $$('.chapter-sep');
  seps.forEach(sep => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          sep.classList.add('visible');
          setTimeout(() => sep.classList.remove('visible'), 2000);
        }
      });
    }, { threshold: 0.5 });
    observer.observe(sep);
  });

  // ==========================================================
  //  ⑨ 文章弹出层
  // ==========================================================
  const articleModal = $('#articleModal');
  const articleModalClose = $('#articleModalClose');
  const thoughtLinks = $$('.thought-link');

  thoughtLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      articleModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeArticleModal() {
    articleModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  articleModalClose.addEventListener('click', closeArticleModal);
  articleModal.addEventListener('click', (e) => {
    if (e.target === articleModal) closeArticleModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && articleModal.classList.contains('open')) closeArticleModal();
  });

  // ==========================================================
  //  ⑩ 手记区灯箱
  // ==========================================================
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxClose = $('#lightboxClose');

  noteCards.forEach(card => {
    card.addEventListener('click', () => {
      const img = $('.note-card-img img', card);
      if (!img) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });

  // ==========================================================
  //  ⑪ 公共留言墙（Firebase）
  // ==========================================================
  const messageForm = $('#messageForm');
  const stickyNotesEl = $('#stickyNotes');

  // Firebase 配置（公开读取，写入需要认证规则——但在信任模式下使用简易方案）
  // 此处使用 localStorage 作为简易方案（无需注册 Firebase，后续可升级）
  // 如需真正公开留言墙，替换为 Firebase Realtime Database 配置即可

  const STORAGE_KEY = 'zhenye_message_wall';

  function getMessages() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function saveMessages(msgs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  }

  function renderMessages() {
    const msgs = getMessages();
    if (msgs.length === 0) {
      stickyNotesEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;width:100%;">还没有便签，来做第一个留言的人吧 ✨</p>';
      return;
    }
    stickyNotesEl.innerHTML = msgs.map((m, i) => `
      <div class="sticky-note" style="transform:rotate(${m.rotation || 0}deg);">
        <div class="sticky-author">${m.author || '匿名'}</div>
        <div class="sticky-body">${escapeHtml(m.content)}</div>
        <div class="sticky-time">${m.time}</div>
        <button class="sticky-delete" data-index="${i}" title="删除">✕</button>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const author = $('#msgAuthor').value.trim() || '匿名';
    const content = $('#msgContent').value.trim();
    if (!content) return;

    const msgs = getMessages();
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    msgs.unshift({
      author,
      content,
      time: timeStr,
      rotation: (Math.random() - 0.5) * 5, // ±2.5°
    });

    // 最多保留 50 条
    if (msgs.length > 50) msgs.length = 50;

    saveMessages(msgs);
    renderMessages();

    // 清空表单
    $('#msgContent').value = '';
    showToast('便签已贴上 📝');

    // 动画最新便签
    setTimeout(() => {
      const firstNote = $('.sticky-note', stickyNotesEl);
      if (firstNote) {
        gsap.fromTo(firstNote, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' });
      }
    }, 50);
  });

  // 删除便签
  stickyNotesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.sticky-delete');
    if (!btn) return;
    const index = parseInt(btn.dataset.index);
    if (isNaN(index)) return;
    const msgs = getMessages();
    if (index >= 0 && index < msgs.length) {
      msgs.splice(index, 1);
      saveMessages(msgs);
      renderMessages();
    }
  });

  renderMessages();

  // ==========================================================
  //  ⑫ 交互组件提示
  // ==========================================================
  const HINT_KEY = 'zhenye_hints_shown';

  function getHintsShown() {
    try { return JSON.parse(localStorage.getItem(HINT_KEY)) || {}; } catch { return {}; }
  }

  function markHintShown(name) {
    const hints = getHintsShown();
    hints[name] = true;
    localStorage.setItem(HINT_KEY, JSON.stringify(hints));
  }

  const hintsShown = getHintsShown();

  // 兴趣标签提示
  if (!hintsShown.tags) {
    const tagsRow = $('#tagsRow');
    const tagHint = document.createElement('span');
    tagHint.className = 'hint-badge';
    tagHint.textContent = '戳我看看';
    tagHint.style.position = 'absolute';
    tagHint.style.top = '-30px';
    tagsRow.style.position = 'relative';
    tagsRow.appendChild(tagHint);

    setTimeout(() => {
      tagHint.classList.add('show');
      setTimeout(() => {
        tagHint.classList.remove('show');
        setTimeout(() => tagHint.remove(), 400);
      }, 3000);
    }, 1500);

    markHintShown('tags');
  }

  // 手记卡片提示
  if (!hintsShown.notes) {
    const firstNoteCard = noteCards[0];
    if (firstNoteCard) {
      const noteHint = document.createElement('div');
      noteHint.className = 'note-hint';
      noteHint.textContent = '点击查看大图';

      const showNoteHint = () => {
        const rect = firstNoteCard.getBoundingClientRect();
        noteHint.style.left = rect.left + rect.width / 2 + 'px';
        noteHint.style.top = rect.top - 30 + 'px';
        noteHint.style.transform = 'translate(-50%, 0)';
        document.body.appendChild(noteHint);
        setTimeout(() => noteHint.classList.add('show'), 100);
        setTimeout(() => {
          noteHint.classList.remove('show');
          setTimeout(() => noteHint.remove(), 300);
        }, 3500);
      };

      // 卡片进入视口时触发
      const hintObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            showNoteHint();
            hintObserver.unobserve(firstNoteCard);
            markHintShown('notes');
          }
        });
      }, { threshold: 0.8 });
      hintObserver.observe(firstNoteCard);
    }
  }

  // 隐藏歌单音符提示
  if (!hintsShown.music) {
    const musicHintObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const note = $('.music-note');
          if (note) {
            const mHint = document.createElement('span');
            mHint.style.cssText = 'position:absolute;font-size:0.7rem;color:var(--text-muted);top:-20px;left:50%;transform:translateX(-50%);white-space:nowrap;opacity:0;transition:opacity 0.5s;';
            mHint.textContent = '♪ 听歌？';
            musicToggle.style.position = 'relative';
            musicToggle.appendChild(mHint);
            setTimeout(() => { mHint.style.opacity = '1'; }, 500);
            setTimeout(() => {
              mHint.style.opacity = '0';
              setTimeout(() => mHint.remove(), 500);
            }, 4000);
          }
          musicHintObserver.unobserve(musicToggle);
          markHintShown('music');
        }
      });
    }, { threshold: 0.8 });
    musicHintObserver.observe(musicToggle);
  }

  // ==========================================================
  //  全局 — Toast 提示
  // ==========================================================
  let toastTimer;
  function showToast(msg) {
    let toast = $('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ==========================================================
  //  全局视差 — 手记卡片 + 思考区卡片封面
  // ==========================================================
  noteCards.forEach((card, i) => {
    gsap.fromTo(card,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.5, delay: i * 0.06, ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom-=50px',
          toggleActions: 'play none none reverse',
        }
      }
    );
    const img = $('.note-card-img img', card);
    if (img) {
      gsap.fromTo(img, { y: -15 }, {
        y: 15, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 0.5 }
      });
    }
  });

  cards.forEach(card => {
    const img = $('.thought-card-img img', card);
    if (img) {
      gsap.fromTo(img, { y: -10 }, {
        y: 10, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 0.5 }
      });
    }
  });

  // ==========================================================
  // 完成
  // ==========================================================
  console.log('✨ 个人主页交互就绪（优化版）— 温润材质 × 锐利工艺');

});
