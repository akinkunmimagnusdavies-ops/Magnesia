// ================= MAGNESIA GROUP - script.js =================
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

const PAYSTACK_PUBLIC_KEY = 'pk_test_f61fad5552949430512133b7d060f90d158660ef';
const WHATSAPP_NUMBER = '2349156002887';
const BACKEND_VERIFY_URL = '/api/verify-paystack';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('load', () => window.scrollTo(0, 0));

// ---------- LOAD PRODUCTS ----------
fetch('products.json')
  .then(res => res.json())
  .then(data => {
    // Remove duplicate products with same id
    products = [...new Map(data.map(item => [item.id, item])).values()];
    renderProducts(products);
    renderBestSellers();
    initBestScroll();
    updateCartCount();
    renderCart();
  })
  .catch(err => console.error("Failed to load products.json", err));

// ---------- HELPERS ----------
function getTemplate(id) {
  const t = document.getElementById(id);
  return t ? t.content.cloneNode(true) : null;
}

function createEmptyState(message, extraClass = '') {
  const clone = getTemplate('empty-state-template');
  const p = clone.querySelector('.empty-state');
  p.textContent = message;
  if (extraClass) p.classList.add(extraClass);
  return clone;
}

// If image no dey, show placeholder instead of broken icon
function setImageWithFallback(imgEl, src, alt) {
  imgEl.src = src;
  imgEl.alt = alt || '';
  imgEl.onerror = function () {
    this.onerror = null; // make e no loop
    this.src = 'images/placeholder.jpg';
  };
}

// ---------- RENDER MAIN GRID ----------
function renderProducts(list) {
  const grid = document.getElementById('productGrid');
  const tpl = document.getElementById('product-card-template');
  if (!grid || !tpl) return;
  grid.innerHTML = '';

  if (list.length === 0) {
    grid.appendChild(createEmptyState('No products found', 'grid-full'));
    return;
  }

  list.forEach(p => {
    const clone = tpl.content.cloneNode(true);

    const imgEl = clone.querySelector('.tpl-img');
    setImageWithFallback(imgEl, p.image, p.name);

    clone.querySelector('.tpl-name').textContent = p.name;
    clone.querySelector('.tpl-size').textContent = p.size || '';
    clone.querySelector('.tpl-price').textContent = `₦${p.wholesalePrice.toLocaleString()}`;

    clone.querySelector('.tpl-cart-btn').addEventListener('click', () => addToCart(p.id));
    clone.querySelector('.tpl-details-btn').addEventListener('click', () => showDetails(p.id));

    const card = clone.querySelector('.card');
    card.dataset.category = p.category;
    card.dataset.type = p.type;

    grid.appendChild(clone);
  });
}

// ---------- RENDER BEST SELLERS SLIDER ----------
function renderBestSellers() {
  const allTracks = document.querySelectorAll('.best-track');
  const tpl = document.getElementById('best-card-template');
  if (!products.length || !tpl) return;

  allTracks.forEach(track => {
    const filter = track.dataset.filter;
    let filtered = products;

    if (filter && filter !== 'all') {
      if (filter === 'bestSeller') {
        filtered = products.filter(p => p.bestSeller === true);
      } else {
        filtered = products.filter(p => p.category === filter);
      }
    }

    track.innerHTML = '';
    if (filtered.length === 0) {
      const empty = createEmptyState(`No products in ${filter}`);
      empty.querySelector('p').classList.add('track-empty');
      track.appendChild(empty);
      return;
    }

    filtered.forEach(p => {
      const clone = tpl.content.cloneNode(true);
      const badge = clone.querySelector('.badge-best');
      if (!p.bestSeller) badge.style.display = 'none';

      const imgEl = clone.querySelector('.tpl-img');
      setImageWithFallback(imgEl, p.image, p.name);

      clone.querySelector('.tpl-name').textContent = p.name;
      clone.querySelector('.tpl-price').textContent = `₦${p.wholesalePrice.toLocaleString()}`;
      clone.querySelector('.tpl-cart-btn').addEventListener('click', () => addToCart(p.id));
      track.appendChild(clone);
    });
  });
}

function initBestScroll() {
  document.querySelectorAll('.best-wrapper').forEach(box => {
    const track = box.querySelector('.best-track');
    const left = box.querySelector('.scroll-btn.left');
    const right = box.querySelector('.scroll-btn.right');
    if (!track || !left || !right) return;
    left.onclick = () => track.scrollBy({ left: -300, behavior: 'smooth' });
    right.onclick = () => track.scrollBy({ left: 300, behavior: 'smooth' });
  });
}

// ---------- CART ----------
function addToCart(id) {
  const item = products.find(p => p.id === id);
  if (!item) return;
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...item, qty: 1 });
  saveCart();
  openDrawer();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  renderCart();
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  const tpl = document.getElementById('cart-item-template');
  if (!container || !totalEl || !tpl) return;
  container.innerHTML = '';

  if (cart.length === 0) {
    container.appendChild(createEmptyState('Cart is empty'));
  } else {
    cart.forEach(c => {
      const clone = tpl.content.cloneNode(true);
      clone.querySelector('.tpl-title').textContent = `${c.name} x${c.qty}`;
      clone.querySelector('.tpl-price').textContent = `₦${(c.wholesalePrice * c.qty).toLocaleString()}`;
      clone.querySelector('.tpl-remove-btn').addEventListener('click', () => removeCart(c.id));
      container.appendChild(clone);
    });
  }
  totalEl.textContent = cart.reduce((a, b) => a + (b.wholesalePrice * b.qty), 0).toLocaleString();
}

function removeCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
}
window.removeCart = removeCart;

// ---------- DRAWER ----------
function openDrawer() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('show');
}
function closeDrawer() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('show');
}

// ---------- MODAL / DETAILS ----------
let currentModalProduct = null;

function showDetails(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentModalProduct = p;

  const modalImg = document.getElementById('modalImg');
  setImageWithFallback(modalImg, p.image, p.name);

  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalSize').textContent = p.size || '';
  document.getElementById('modalDesc').textContent = p.description || '';
  document.getElementById('modalWholesale').textContent = p.wholesalePrice.toLocaleString();
  document.getElementById('productModal').classList.add('open');
}
window.showDetails = showDetails;

// ---------- EVENTS ----------
document.getElementById('closeModal').onclick = () => document.getElementById('productModal').classList.remove('open');
document.getElementById('productModal').onclick = (e) => { if (e.target.id === 'productModal') e.target.classList.remove('open'); };
document.getElementById('modalAddToCart').onclick = () => {
  if (currentModalProduct) addToCart(currentModalProduct.id);
  document.getElementById('productModal').classList.remove('open');
};

document.getElementById('openCart').onclick = (e) => { e.preventDefault(); openDrawer(); };
document.getElementById('closeCart').onclick = closeDrawer;
document.getElementById('drawerOverlay').onclick = closeDrawer;
document.getElementById('menuBtn').onclick = () => document.getElementById('mainNav').classList.add('open');
document.getElementById('closeNav').onclick = () => document.getElementById('mainNav').classList.remove('open');

// ---------- FILTER ----------
document.querySelectorAll('#mainNav [data-filter]').forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll('#mainNav [data-filter]').forEach(a => a.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const cat = e.currentTarget.dataset.filter;
    if (cat === 'all') renderProducts(products);
    else renderProducts(products.filter(p => p.category === cat));
    document.getElementById('mainNav').classList.remove('open');
  };
});

// ---------- CONTACT FORM ----------
document.getElementById('contactForm').onsubmit = (e) => {
  e.preventDefault();
  document.getElementById('formMsg').textContent = "Thanks! We'll contact you shortly.";
  e.target.reset();
};

// ---------- WHATSAPP CHECKOUT ----------
document.getElementById('checkoutBtn').onclick = () => {
  if (cart.length === 0) return alert("Cart empty");
  let msg = "Hello Magnesia, I want to order:%0A";
  let total = 0;
  cart.forEach(c => {
    msg += `- ${c.name} x${c.qty} = ₦${(c.wholesalePrice * c.qty).toLocaleString()}%0A`;
    total += c.wholesalePrice * c.qty;
  });
  msg += `%0ATotal: ₦${total.toLocaleString()}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
};

// ---------- PAYSTACK ----------
document.getElementById('paystackBtn').addEventListener('click', () => {
  if (cart.length === 0) return alert("Your cart is empty");
  const email = document.getElementById('customerEmail').value.trim();
  if (!email || !email.includes('@')) return alert("Enter valid email");
  const total = cart.reduce((a, b) => a + (b.wholesalePrice * b.qty), 0);

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: total * 100,
    currency: "NGN",
    ref: 'MAG_' + Date.now(),
    metadata: {
      custom_fields: [{ display_name: "Cart", variable_name: "cart_items", value: cart.map(c => `${c.name} x${c.qty}`).join(', ') }],
      cart: cart,
      total: total
    },
    callback: function (response) {
      fetch(BACKEND_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: response.reference, email: email, cart: cart, total: total })
      })
        .then(r => r.json()).then(data => {
          if (data.status === 'success') {
            alert('Payment verified! Ref: ' + response.reference);
            let msg = `NEW PAID ORDER - Ref: ${response.reference}%0AEmail: ${email}%0A%0A`;
            cart.forEach(c => msg += `- ${c.name} x${c.qty}%0A`);
            msg += `%0ATotal Paid: ₦${total.toLocaleString()}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
            cart = []; saveCart(); closeDrawer();
          } else {
            alert('Verification failed. We will confirm manually. Ref: ' + response.reference);
          }
        })
        .catch(() => {
          alert('Payment successful! Ref: ' + response.reference);
          cart = []; saveCart(); closeDrawer();
        });
    },
    onClose: function () { }
  });
  handler.openIframe();
});

// ---------- SEARCH ----------
document.getElementById('searchInput').addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase().trim();
  if (keyword === '') { renderProducts(products); return; }
  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(keyword) ||
    (p.description || '').toLowerCase().includes(keyword) ||
    (p.category || '').toLowerCase().includes(keyword)
  );
  renderProducts(filtered);
});