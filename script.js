// script.js — 功能逻辑（产品加载、预订校验、价格计算、提交与 localStorage）
// 中文注释：按要求实现所有关键功能，并预留 AI 更新接口

// ---------------------------
// 1. 产品数据配置（季度产品）
// ---------------------------
const products = [
  // 本季度样例产品（便于后续季度更新）
  {
    id: 'p1',
    name: '紫苏消食茶',
    price: 8.90,
    description: '选用新鲜紫苏叶搭配洋甘菊，温和促进消化，适合饭后饮用。',
    ingredients: ['紫苏叶', '洋甘菊'],
    tag: '促进消化'
  },
  {
    id: 'p2',
    name: '薄荷清凉茶',
    price: 9.50,
    description: '薄荷与柠檬的清爽组合，帮助提神醒脑，适合午后饮用。',
    ingredients: ['薄荷', '柠檬'],
    tag: '清凉提神'
  },
  {
    id: 'p3',
    name: '草本疗愈茶',
    price: 10.90,
    description: '混合多种草本，旨在舒缓情绪与恢复活力的全面疗愈配方。',
    ingredients: ['洋甘菊', '玫瑰', '人参'],
    tag: '全面疗愈'
  },
  {
    id: 'p4',
    name: '玫瑰舒心茶（限量）',
    price: 11.50,
    description: '芳香玫瑰搭配轻柔草本，提升情绪并带来愉悦的味觉体验。',
    ingredients: ['玫瑰', '洋甘菊'],
    tag: '芳香舒缓'
  }
];

// ---------------------------
// 2. 页面元素选择（缓存 DOM）
// ---------------------------
const productListEl = document.getElementById('product-list');
const productSelectEl = document.getElementById('product-select');
const quantitySelectEl = document.getElementById('quantity-select');
const priceDisplayEl = document.getElementById('price-display');
const bookingForm = document.getElementById('booking-form');
const pickupDateEl = document.getElementById('pickup-date');
const nameInput = document.getElementById('customer-name');
const phoneInput = document.getElementById('customer-phone');
const locationSelect = document.getElementById('location-select');
const specialReq = document.getElementById('special-requests');
const formMessage = document.getElementById('form-message');

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalOk = document.getElementById('modal-ok');

const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

const saveLocalBtn = document.getElementById('save-local');
const yearSpan = document.getElementById('year');

// ---------------------------
// 3. 初始化 UI：产品渲染与下拉填充
// ---------------------------
function renderProducts() {
  // 清空
  productListEl.innerHTML = '';
  productSelectEl.innerHTML = '<option value="">请选择茶品</option>';

  products.forEach(p => {
    // 创建产品卡片
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <div>
        <div class="product-top">
          <h4 class="product-name">${escapeHTML(p.name)} <span class="product-price">S$ ${p.price.toFixed(2)}</span></h4>
          <p class="product-desc">${escapeHTML(p.description)}</p>
        </div>
        <div class="product-tags">${escapeHTML(p.tag)}</div>
        <div class="product-ingredients">${p.ingredients.map(i => `<span class="ingredient">${escapeHTML(i)}</span>`).join('')}</div>
      </div>
    `;
    productListEl.appendChild(card);

    // 填充下拉选项
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} — S$ ${p.price.toFixed(2)}`;
    productSelectEl.appendChild(opt);
  });
}

// 简单的 HTML 转义，避免注入（输入均来自静态数据，但仍然安全处理）
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}

// ---------------------------
// 4. 价格计算与显示
// ---------------------------
function getProductById(id) {
  return products.find(p => p.id === id);
}

// 计算总价并更新界面
function updatePriceDisplay() {
  const prodId = productSelectEl.value;
  const qty = Number(quantitySelectEl.value) || 1;
  if (!prodId) {
    priceDisplayEl.textContent = '-';
    return;
  }
  const p = getProductById(prodId);
  if (!p) {
    priceDisplayEl.textContent = '-';
    return;
  }
  const total = +(p.price * qty).toFixed(2);
  priceDisplayEl.textContent = `S$ ${total.toFixed(2)}`;
}

// ---------------------------
// 5. 预订日期验证：至少提前 2 天
// ---------------------------
function setMinPickupDate() {
  // 设置 date input 的最小可选日期为今天 + 2 天
  const now = new Date();
  now.setDate(now.getDate() + 2); // +2 天
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;
  pickupDateEl.min = minDate;
  // 如果当前选择比 min 小则清空
  if (pickupDateEl.value && pickupDateEl.value < minDate) {
    pickupDateEl.value = '';
  }
}

// 校验用户选择日期是否满足规则
function validatePickupDate() {
  const val = pickupDateEl.value;
  if (!val) return { ok: false, message: '请选择取货日期（至少提前 2 天）。' };
  const selected = new Date(val + 'T00:00:00');
  const min = new Date();
  min.setHours(0,0,0,0);
  min.setDate(min.getDate() + 2);
  if (selected < min) {
    return { ok: false, message: '取货日期需至少提前 2 天。' };
  }
  return { ok: true };
}

// ---------------------------
// 6. 表单校验与提交（显示模态）
// ---------------------------
function validateForm() {
  formMessage.textContent = '';
  // 产品
  if (!productSelectEl.value) {
    return { ok: false, message: '请选择茶品。' };
  }
  // 取货点
  if (!locationSelect.value) {
    return { ok: false, message: '请选择取货点。' };
  }
  // 日期
  const dateCheck = validatePickupDate();
  if (!dateCheck.ok) return { ok: false, message: dateCheck.message };
  // 名称
  if (!nameInput.value.trim()) {
    return { ok: false, message: '请输入客户姓名。' };
  }
  // 电话（简单校验）
  const phone = phoneInput.value.trim();
  if (!phone) {
    return { ok: false, message: '请输入联系电话。' };
  }
  // 新加坡电话号码大致格式为 8 位数字或带 +65
  const phoneNormalized = phone.replace(/\s+/g, '');
  const sgPhoneRegex = /^(\+65)?\d{8}$/;
  if (!sgPhoneRegex.test(phoneNormalized)) {
    return { ok: false, message: '请输入有效的新加坡联系电话（例如 +65 91234567 或 91234567）。' };
  }

  return { ok: true };
}

// 生成预订对象
function buildBookingObject() {
  const product = getProductById(productSelectEl.value);
  const qty = Number(quantitySelectEl.value) || 1;
  const total = +(product.price * qty).toFixed(2);
  return {
    id: `bk_${Date.now()}`,
    productId: product.id,
    productName: product.name,
    unitPrice: product.price,
    quantity: qty,
    totalPrice: total,
    location: locationSelect.value,
    pickupDate: pickupDateEl.value,
    customerName: nameInput.value.trim(),
    customerPhone: phoneInput.value.trim(),
    specialRequests: specialReq.value.trim(),
    createdAt: new Date().toISOString()
  };
}

// 保存到 localStorage（附加）
function saveBookingToLocalStorage(booking) {
  try {
    const key = 'yuncha_bookings';
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(booking);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (err) {
    console.error('保存预订到 localStorage 失败：', err);
  }
}

// 显示模态确认
function showModalWithBooking(booking) {
  modalBody.innerHTML = `
    <p><strong>客户：</strong>${escapeHTML(booking.customerName)}</p>
    <p><strong>电话：</strong>${escapeHTML(booking.customerPhone)}</p>
    <p><strong>茶品：</strong>${escapeHTML(booking.productName)} × ${booking.quantity}（S$ ${booking.totalPrice.toFixed(2)}）</p>
    <p><strong>取货点：</strong>${escapeHTML(booking.location)}</p>
    <p><strong>取货日期：</strong>${escapeHTML(booking.pickupDate)}</p>
    ${booking.specialRequests ? `<p><strong>备注：</strong>${escapeHTML(booking.specialRequests)}</p>` : ''}
    <p class="muted">我们已为您保存预订记录（保存在浏览器中）。如需取消或修改，请联系 +65 6123 4567。</p>
  `;
  modal.setAttribute('aria-hidden','false');
  // 防止背景滚动（简单）
  document.body.style.overflow = 'hidden';
}

// 关闭模态
function closeModal() {
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

// 表单提交处理
bookingForm.addEventListener('submit', function (e) {
  e.preventDefault();
  formMessage.textContent = '';

  const v = validateForm();
  if (!v.ok) {
    formMessage.textContent = v.message;
    return;
  }

  const booking = buildBookingObject();

  // 模拟保存逻辑（未来可以替换为服务器 API）
  saveBookingToLocalStorage(booking);

  // 显示模态确认
  showModalWithBooking(booking);

  // 清理表单或保留草稿（这里保留选择，用户可以关闭后继续）
});

// 本地保存草稿（可选）
saveLocalBtn.addEventListener('click', function () {
  const partial = {
    productId: productSelectEl.value,
    quantity: quantitySelectEl.value,
    location: locationSelect.value,
    pickupDate: pickupDateEl.value,
    customerName: nameInput.value.trim(),
    customerPhone: phoneInput.value.trim(),
    specialRequests: specialReq.value.trim(),
    savedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem('yuncha_draft', JSON.stringify(partial));
    formMessage.textContent = '已保存草稿到本地。';
  } catch (err) {
    formMessage.textContent = '保存草稿失败，请检查浏览器设置。';
    console.error(err);
  }
});

// 从草稿恢复（如果存在）
function restoreDraftIfExists() {
  try {
    const raw = localStorage.getItem('yuncha_draft');
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.productId) productSelectEl.value = draft.productId;
    if (draft.quantity) quantitySelectEl.value = draft.quantity;
    if (draft.location) locationSelect.value = draft.location;
    if (draft.pickupDate) pickupDateEl.value = draft.pickupDate;
    if (draft.customerName) nameInput.value = draft.customerName;
    if (draft.customerPhone) phoneInput.value = draft.customerPhone;
    if (draft.specialRequests) specialReq.value = draft.specialRequests;
    updatePriceDisplay();
  } catch (err) {
    console.warn('恢复草稿异常：', err);
  }
}

// ---------------------------
// 7. 事件绑定：交互逻辑
// ---------------------------

// 更新价格当产品或数量改变
productSelectEl.addEventListener('change', updatePriceDisplay);
quantitySelectEl.addEventListener('change', updatePriceDisplay);

// 当日期或屏幕载入时设置最小可选日期
window.addEventListener('load', function () {
  renderProducts();
  setMinPickupDate();
  restoreDraftIfExists();
  updatePriceDisplay();
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});

// 每天刷新时也可调整 min（用户在页面久开时）
window.addEventListener('focus', setMinPickupDate);

// 模态关闭
modalClose.addEventListener('click', closeModal);
modalOk.addEventListener('click', () => {
  closeModal();
  // 提交后清空表单（按需）
  bookingForm.reset();
  priceDisplayEl.textContent = '-';
  formMessage.textContent = '预订已提交。我们会在您取货前通过电话联系确认。';
});

// 点击 modal 背景也关闭（辅助）
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// 导航汉堡控制（移动）
navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  // 切换菜单显示
  if (!expanded) {
    mainNav.classList.add('open');
    mainNav.style.display = 'block';
  } else {
    mainNav.classList.remove('open');
    mainNav.style.display = '';
  }
});

// 键盘可访问：Esc 关闭模态
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modal.getAttribute('aria-hidden') === 'false') closeModal();
    if (navToggle.getAttribute('aria-expanded') === 'true') {
      navToggle.setAttribute('aria-expanded', 'false');
      mainNav.classList.remove('open');
      mainNav.style.display = '';
    }
  }
});

// 防止表单提交时回车触发导航等问题（细节）
bookingForm.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    // 允许在输入时直接回车提交，但我们让 form 自行处理（不阻止）
  }
});

// ---------------------------
// 8. 预留：AI 内容更新接口（占位函数）
// ---------------------------
// 说明：未来可替换为实际 AI 服务调用，例如更新产品描述、生成季度菜单等。
// 目前仅提供一个 Promise 风格的占位函数，便于后续集成。
function fetchAIGeneratedContentForQuarter(quarterIdentifier) {
  // 参数示例： "2026-Q3"
  // 返回值示例： Promise.resolve([{id:'p5', name:'...', price:...}, ...])
  return new Promise((resolve) => {
    // TODO: 未来调用真实 API。当前模拟延迟。
    console.log('fetchAIGeneratedContentForQuarter(): 占位调用 ->', quarterIdentifier);
    setTimeout(() => {
      // 模拟返回空（意味着无更新）
      resolve([]);
    }, 600);
  });
}

// 使用示例（不会自动触发）：
// fetchAIGeneratedContentForQuarter('2026-Q3').then(newProducts => { /* 合并或替换 products 后 renderProducts() */ });

// ---------------------------
// 9. 实用函数：格式化与验证等
// ---------------------------
// （已在上方实现 escapeHTML 等）
// ---------------------------

// 结束脚本
console.log('YunCha 前端脚本已加载。');
