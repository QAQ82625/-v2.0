/* ============================================================
   个人主页 — 交互脚本
   核心技术：GSAP + ScrollTrigger
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
  //  2. 侧边导航点
  // ==========================================================
  const dots = $$('#sideDots .dot');
  const sections = ['hero', 'about', 'thoughts', 'notes', 'contact']
    .map(id => $('#' + id))
    .filter(Boolean);

  function updateSideDots() {
    const scrollY = window.scrollY + window.innerHeight / 2;
    let current = 'hero';

    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top + window.scrollY;
      if (scrollY >= top) current = sec.id;
    });

    dots.forEach(d => {
      d.classList.toggle('active', d.dataset.target === current);
    });
  }

  window.addEventListener('scroll', updateSideDots, { passive: true });

  // ==========================================================
  //  3. 首屏 — 入场动画 + 光晕跟随
  // ==========================================================
  const heroContent = $('.hero-content');
  const scrollHint = $('#scrollHint');
  const heroGlow = $('#heroGlow');

  // 入场
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to(heroContent, { opacity: 1, duration: 0.8 })
    .to(scrollHint, { opacity: 1, duration: 0.6 }, '-=0.2');

  // 光晕跟随鼠标
  const hero = $('#hero');
  let glowX = window.innerWidth / 2;
  let glowY = window.innerHeight / 2;
  let currentX = glowX;
  let currentY = glowY;

  hero.addEventListener('mousemove', (e) => {
    glowX = e.clientX;
    glowY = e.clientY;
  });

  function animateGlow() {
    currentX += (glowX - currentX) * 0.05;
    currentY += (glowY - currentY) * 0.05;
    heroGlow.style.left = currentX + 'px';
    heroGlow.style.top = currentY + 'px';
    requestAnimationFrame(animateGlow);
  }
  animateGlow();

  // 初始化光晕位置
  heroGlow.style.left = '50%';
  heroGlow.style.top = '50%';

  // ==========================================================
  //  4. 关于区 — 兴趣标签交互
  // ==========================================================

  // 兴趣数据
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

      // 如果点击同一个标签，关闭面板
      if (activeInterest === key && dataPanel.classList.contains('open')) {
        closeDataPanel();
        return;
      }

      // 打开/切换面板
      activeInterest = key;
      const data = interestData[key];
      if (!data) return;

      // 构建面板内容
      dataPanelInner.innerHTML = `
        <div class="data-panel-header">${data.icon} ${data.name}</div>
        ${data.items.map(item => `
          <div class="data-item"><strong>${item.label}</strong>：${item.value}</div>
        `).join('')}
      `;

      // 展开
      dataPanel.classList.add('open');

      // 高亮当前标签
      tags.forEach(t => t.classList.toggle('active', t.dataset.interest === key));
    });
  });

  // 点击面板外部关闭
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
  //  5. 思考区 — 横向翻阅 ⭐ 招牌功能
  // ==========================================================
  const thoughtsSection = $('#thoughts');
  const thoughtsTrack = $('#thoughtsTrack');
  const thoughtsTitle = $('#thoughtsTitle');
  const thoughtsDots = $('#thoughtsDots');
  const thoughtsCounter = $('#thoughtsCounter');
  const arrowLeft = $('#thoughtsArrowLeft');
  const arrowRight = $('#thoughtsArrowRight');

  const cards = $$('.thought-card', thoughtsTrack);
  const totalCards = cards.length;
  let currentCardIndex = 0;

  function getMetrics() {
    if (cards.length === 0) return { cardW: 320, gap: 24, totalW: 0, scrollDist: 0 };
    const cardW = cards[0].offsetWidth;
    const gap = 24;
    const totalW = totalCards * (cardW + gap) - gap;
    const scrollDist = Math.max(0, totalW - cardW);
    return { cardW, gap, totalW, scrollDist };
  }

  // 创建横向滚动 ScrollTrigger
  let thoughtST;

  function createThoughtScroll() {
    if (thoughtST) thoughtST.kill();

    const { scrollDist, cardW } = getMetrics();
    if (scrollDist <= 0) return;

    // 重置
    gsap.set(thoughtsTrack, { x: 0 });
    // 左右内边距让首尾卡片居中
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
        },
        onEnter: () => {
          gsap.to(thoughtsTitle, { opacity: 1, duration: 0.4 });
        },
      }
    });

    tl.to(thoughtsTrack, {
      x: -scrollDist,
      ease: 'none',
    });

    thoughtST = tl.scrollTrigger;
  }

  function updateThoughtNav() {
    const tDots = $$('.t-dot', thoughtsDots);
    tDots.forEach((d, i) => d.classList.toggle('active', i === currentCardIndex));
    thoughtsCounter.textContent = `${currentCardIndex + 1} / ${totalCards}`;
    arrowLeft.classList.toggle('hidden', currentCardIndex === 0);
    arrowRight.classList.toggle('hidden', currentCardIndex === totalCards - 1);
  }

  // 箭头点击
  arrowRight.addEventListener('click', () => {
    if (currentCardIndex < totalCards - 1) {
      currentCardIndex++;
      scrollToCard(currentCardIndex);
    }
  });
  arrowLeft.addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      scrollToCard(currentCardIndex);
    }
  });

  // 圆点点击
  thoughtsDots.addEventListener('click', (e) => {
    const dot = e.target.closest('.t-dot');
    if (!dot) return;
    const idx = [...thoughtsDots.children].indexOf(dot);
    if (idx >= 0 && idx < totalCards) {
      currentCardIndex = idx;
      scrollToCard(idx);
    }
  });

  function scrollToCard(index) {
    if (!thoughtST) return;
    const progress = totalCards > 1 ? index / (totalCards - 1) : 0;
    const start = thoughtST.start;
    const end = thoughtST.end;
    const scrollPos = start + progress * (end - start);
    window.scrollTo({ top: scrollPos, behavior: 'smooth' });
  }

  // 初始化
  createThoughtScroll();
  updateThoughtNav();

  // 窗口大小变化时重建
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
  //  6. 手记区 — 分类筛选
  // ==========================================================
  const filterBtns = $$('.filter-btn');
  const noteCards = $$('#masonry .note-card');
  let activeFilter = 'all';

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      if (filter === activeFilter) return;
      activeFilter = filter;

      // 更新按钮状态
      filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));

      // 筛选卡片（带时序动画）
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

      // 先隐藏
      toHide.forEach((card, i) => {
        gsap.to(card, {
          opacity: 0, scale: 0.95, duration: 0.25,
          delay: i * 0.03,
          onComplete: () => card.classList.add('hidden'),
        });
      });

      // 再显示（延迟一点让隐藏先开始）
      setTimeout(() => {
        toShow.forEach(card => card.classList.remove('hidden'));
        toShow.forEach((card, i) => {
          gsap.fromTo(card,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.35, delay: i * 0.04, ease: 'power2.out' }
          );
        });
      }, 200);
    });
  });

  // ==========================================================
  //  7. 联系区 — 图标悬停标签（CSS 已处理大部分）
  // ==========================================================
  // （悬停效果由 CSS transition 完成，无需额外 JS）

  // ==========================================================
  //  8. 页脚 — 彩蛋三重奏
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
  const musicToggle = $('#musicToggle');
  const musicPlayer = $('#musicPlayer');
  const audioPlayer = $('#audioPlayer');
  let currentTrackBtn = null;

  musicToggle.addEventListener('click', () => {
    musicPlayer.classList.toggle('open');
    // 更新 aria
    const isOpen = musicPlayer.classList.contains('open');
    musicToggle.setAttribute('aria-label', isOpen ? '关闭歌单' : '隐藏歌单');
  });

  // 播放控制
  musicPlayer.addEventListener('click', (e) => {
    const btn = e.target.closest('.track-play');
    if (!btn) return;

    const track = btn.closest('.music-track');
    const src = track.dataset.src;

    // 同一首歌：暂停/继续
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

    // 切歌
    if (currentTrackBtn) {
      currentTrackBtn.textContent = '▶';
      currentTrackBtn.classList.remove('playing');
    }

    audioPlayer.src = src;
    audioPlayer.play().catch(() => { /* 浏览器可能阻止自动播放 */ });
    btn.textContent = '⏸';
    btn.classList.add('playing');
    currentTrackBtn = btn;
  });

  // 播放结束
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
      // 文字"融化"
      gsap.to(copyEaster, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          copyEaster.textContent = secretText;
          gsap.to(copyEaster, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        }
      });
    }, 1500);
  });

  footerCopy.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    // 恢复原文
    if (copyEaster.textContent === secretText) {
      gsap.to(copyEaster, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          copyEaster.textContent = originalText;
          gsap.to(copyEaster, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        }
      });
    }
  });

  // --- 8d. 回到顶部 ---
  $('#backToTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ==========================================================
  //  9. 全局 — 关于区/手记区 进入视口时的淡入动画
  // ==========================================================
  const fadeInSections = ['#about', '#notes', '#contact'];
  fadeInSections.forEach(sel => {
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
          start: 'top bottom-=100px',
          toggleActions: 'play none none reverse',
        }
      }
    );
  });

  // 手记区卡片逐个淡入视差
  noteCards.forEach((card, i) => {
    gsap.fromTo(card,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.5,
        delay: i * 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom-=50px',
          toggleActions: 'play none none reverse',
        }
      }
    );

    // 卡片视差：封面图比文字慢
    const img = $('.note-card-img img', card);
    if (img) {
      gsap.fromTo(img,
        { y: -15 },
        {
          y: 15,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          }
        }
      );
    }
  });

  // 思考区卡片封面视差
  cards.forEach(card => {
    const img = $('.thought-card-img img', card);
    if (img) {
      gsap.fromTo(img,
        { y: -10 },
        {
          y: 10,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          }
        }
      );
    }
  });

  // ==========================================================
  // 完成
  // ==========================================================
  console.log('✨ 个人主页交互就绪 — 温润材质 × 锐利工艺');

});
