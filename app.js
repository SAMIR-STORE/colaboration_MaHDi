const STORE_CONFIG = { whatsappNumber: "212600000000", shippingCost: 0, webhookUrl: "" };

const PRODUCTS = [
  { 
    id: "BUNDLE-001", 
    sku: "#BUNDLE-001", 
    name: "بيجامة مبرة", 
    gender: "bundle", 
    price: 195, 
    colors: ["موف فاتح", "بنفسجي غامق", " أزرق بترولي", "وردي غامق"], 
    sizes: ["L", "XL", "2XL"], 
    images: ["image_a1.jpg", "image_a2.jpg", "image_a3.jpg", "image_a4.jpeg"], 
    emoji: "👗" 
  }
];

let cart = JSON.parse(localStorage.getItem("fashion_cart") || "[]");
let recommendedSize = "";
const carouselTimers = new Map();
let activeProductId = "";
let activeProductImageIndex = 0;

const $ = (selector) => document.querySelector(selector);
function money(value) { return `${value.toLocaleString("fr-MA")} درهم`; }
function saveCart() { localStorage.setItem("fashion_cart", JSON.stringify(cart)); }

function trackEvent(name, data = {}) { 
  console.log(`[analytics] ${name}`, data); 
  if (typeof window.fbq === "function") window.fbq("track", name, data); 
  if (typeof window.gtag === "function") window.gtag("event", name, data); 
}

function showToast(message) { 
  const toast = $("#toast"); 
  toast.textContent = message; 
  toast.classList.add("show"); 
  clearTimeout(showToast.timer); 
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500); 
}

function getProduct(id) { return PRODUCTS.find((product) => product.id === id); }

function setCarouselImage(productId, imageIndex) {
  const imageBox = document.querySelector(`[data-carousel="${productId}"]`);
  if (!imageBox) return;
  const images = [...imageBox.querySelectorAll("img")];
  if (!images.length) return;
  const nextIndex = imageIndex % images.length;
  images.forEach((image, index) => image.classList.toggle("is-active", index === nextIndex));
  imageBox.dataset.activeIndex = String(nextIndex);
}

function startProductCarousel(product) {
  if (!product.images?.length) return;
  clearInterval(carouselTimers.get(product.id));
  let imageIndex = 0;
  setCarouselImage(product.id, imageIndex);
  const timer = setInterval(() => {
    imageIndex = (imageIndex + 1) % product.images.length;
    setCarouselImage(product.id, imageIndex);
  }, 1000);
  carouselTimers.set(product.id, timer);
}

function openProductDetails(productId, imageIndex = 0) {
  const product = getProduct(productId);
  if (!product) return;
  activeProductId = productId;
  activeProductImageIndex = imageIndex;
  $("#product-modal-thumbnails").innerHTML = (product.images || []).map((image, index) => `<button class="product-thumbnail ${index === activeProductImageIndex ? "is-active" : ""}" data-thumbnail-index="${index}" type="button" aria-label="الصورة ${index + 1}"><img src="${image}" alt="" /></button>`).join("");
  document.querySelectorAll("[data-thumbnail-index]").forEach((button) => button.addEventListener("click", () => showProductImage(Number(button.dataset.thumbnailIndex))));
  showProductImage(activeProductImageIndex);
  $("#product-modal-name").textContent = product.name;
  $("#product-modal-sku").textContent = product.sku;
  $("#product-modal-price").textContent = money(product.price);
  $("#product-modal-color").innerHTML = product.colors.map((color) => `<option>${color}</option>`).join("");
  $("#product-modal-size").innerHTML = product.sizes.map((size) => `<option>${size}</option>`).join("");
  $("#product-modal-size").value = recommendedSize && product.sizes.includes(recommendedSize) ? recommendedSize : product.sizes[0];
  $("#product-modal").showModal();
}

function showProductImage(imageIndex) {
  const product = getProduct(activeProductId);
  if (!product?.images?.length) return;
  activeProductImageIndex = (imageIndex + product.images.length) % product.images.length;
  const image = $("#product-modal-image");
  image.src = product.images[activeProductImageIndex];
  image.alt = `${product.name} - صورة ${activeProductImageIndex + 1}`;
  image.classList.remove("is-zoomed");
  document.querySelectorAll("[data-thumbnail-index]").forEach((button) => button.classList.toggle("is-active", Number(button.dataset.thumbnailIndex) === activeProductImageIndex));
}

function renderProducts() {
  $("#product-count").textContent = `${PRODUCTS.length} منتجات`;
  $("#product-grid").innerHTML = PRODUCTS.map((product) => `<article class="product-card">
    <div class="product-image" data-carousel="${product.id}" role="button" tabindex="0" aria-label="شوف تفاصيل ${product.name}">
      ${(product.images && product.images.length > 0) ? product.images.map((img, index) => `<img class="${index === 0 ? "is-active" : ""}" src="${img}" alt="${product.name} - صورة ${index + 1}" data-image-index="${index}" />`).join("") : `<span title="زيد الصورة فـ app.js">${product.emoji}</span>`}
    </div>
    <div class="product-info">
      <div class="price-row"><button class="product-title" data-open-product="${product.id}" type="button">${product.name}</button><span class="sku">${product.sku}</span></div>
      <p>${product.gender === "male" ? "رجالي" : product.gender === "female" ? "نسائي" : "بيجامة مبرة"} • اختار اللون والمقاس</p>
      <div class="field-row">
        <select id="color-${product.id}" aria-label="اللون">${product.colors.map((color) => `<option>${color}</option>`).join("")}</select>
        <select id="size-${product.id}" aria-label="المقاس">${product.sizes.map((size) => `<option>${size}</option>`).join("")}</select>
      </div>
      <div class="price-row">
        <span class="price">${money(product.price)}</span>
        <div class="card-actions">
          <button class="quick-button" data-buy="${product.id}" type="button">شراء سريع</button>
          <button class="primary-button" data-add="${product.id}" type="button">أضف للسلة</button>
        </div>
      </div>
    </div>
  </article>`).join("");
  
  document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => addToCart(button.dataset.add)));
  document.querySelectorAll("[data-buy]").forEach((button) => button.addEventListener("click", () => { addToCart(button.dataset.buy, false); openCheckout(); }));
  PRODUCTS.forEach(startProductCarousel);
  document.querySelectorAll("[data-carousel]").forEach((imageBox) => {
    const openDetails = () => openProductDetails(imageBox.dataset.carousel, Number(imageBox.dataset.activeIndex || 0));
    imageBox.addEventListener("click", openDetails);
    imageBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(); }
    });
  });
  document.querySelectorAll("[data-open-product]").forEach((button) => button.addEventListener("click", () => openProductDetails(button.dataset.openProduct)));
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0); 
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  $("#cart-count").textContent = count; 
  $("#cart-total").textContent = money(total);
  $("#cart-items").innerHTML = cart.length ? cart.map((item, index) => `<div class="cart-item"><div><strong>${item.name}</strong><small>${item.color} • ${item.size} • ${money(item.price)} × ${item.quantity}</small></div><button class="remove-item" data-remove="${index}" type="button">حذف</button></div>`).join("") : `<div class="empty-cart">السلة خاوية دابا.<br />زيد شي منتج باش تبدا الطلب.</div>`;
  document.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => { cart.splice(Number(button.dataset.remove), 1); saveCart(); renderCart(); }));
}

function addToCart(productId, notify = true) {
  const product = getProduct(productId); 
  const color = $(`#color-${productId}`)?.value || product.colors[0]; 
  const size = $(`#size-${productId}`)?.value || recommendedSize || product.sizes[0]; 
  const existing = cart.find((item) => item.productId === productId && item.color === color && item.size === size);
  if (existing) existing.quantity += 1; else cart.push({ productId, sku:product.sku, name:product.name, price:product.price, color, size, quantity:1 });
  saveCart(); 
  renderCart(); 
  trackEvent("AddToCart", { productId, value:product.price }); 
  if (notify) showToast("تزّاد المنتج للسلة");
}

function openCart() { $("#cart-drawer").classList.add("open"); $("#backdrop").classList.add("visible"); $("#cart-drawer").setAttribute("aria-hidden", "false"); }
function closeCart() { $("#cart-drawer").classList.remove("open"); $("#backdrop").classList.remove("visible"); $("#cart-drawer").setAttribute("aria-hidden", "true"); }
function openCheckout() { if (!cart.length) { showToast("زيد منتج للسلة أولاً"); return; } closeCart(); trackEvent("InitiateCheckout", { items:cart.length }); $("#checkout-modal").showModal(); }
function createOrderReference() { return `#ORD-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }

function buildWhatsAppMessage(customer) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); 
  const total = subtotal + STORE_CONFIG.shippingCost; 
  const reference = createOrderReference();
  return `مرحباً، أرغب في تأكيد الطلب التالي:\n----------------------------------\n${cart.map((item) => `👕 المنتج: ${item.name} (SKU:${item.sku})\n🎨 اللون: ${item.color}\n📏 المقاس: ${item.size}\n💵 السعر: ${money(item.price)}\n🔢 الكمية: ${item.quantity}`).join("\n----------------------------------\n")}\n----------------------------------\n👤 الاسم: ${customer.name}\n📞 الهاتف: ${customer.phone}\n📍 المدينة: ${customer.city}\n🚚 الشحن: ${money(STORE_CONFIG.shippingCost)}\n💰 المجموع: ${money(total)}\nرقم المرجعية: ${reference}`;
}

async function saveOrder(order) { 
  localStorage.setItem(`order_${order.reference}`, JSON.stringify(order)); 
  if (!STORE_CONFIG.webhookUrl) return; 
  try { await fetch(STORE_CONFIG.webhookUrl, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(order) }); } catch (error) { console.warn("Webhook unavailable", error); } 
}

function renderBuilder() {
  const male = PRODUCTS.filter((product) => product.gender === "male"); 
  const female = PRODUCTS.filter((product) => product.gender === "female");
  $("#male-select").innerHTML = male.map((p) => `<option value="${p.id}">${p.name} — ${money(p.price)}</option>`).join(""); 
  $("#female-select").innerHTML = female.map((p) => `<option value="${p.id}">${p.name} — ${money(p.price)}</option>`).join(""); 
  updateBundlePreview(); 
  $("#male-select").addEventListener("change", updateBundlePreview); 
  $("#female-select").addEventListener("change", updateBundlePreview);
}

function updateBundlePreview() { 
  const a = getProduct($("#male-select").value); 
  const b = getProduct($("#female-select").value); 
  if (!a || !b) return; 
  $("#bundle-preview").textContent = `${a.name} + ${b.name} = ${money(a.price + b.price)} (بدون تخفيض)`; 
}

$("#open-cart").addEventListener("click", openCart); 
$("#close-cart").addEventListener("click", closeCart); 
$("#backdrop").addEventListener("click", closeCart); 
$("#checkout-cart").addEventListener("click", openCheckout);

document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));

$("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault(); 
  const customer = Object.fromEntries(new FormData(event.target)); 
  const message = buildWhatsAppMessage(customer); 
  const reference = message.match(/#ORD-[A-Z0-9-]+/)?.[0] || createOrderReference();
  await saveOrder({ reference, customer, items:cart, total:cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + STORE_CONFIG.shippingCost, createdAt:new Date().toISOString() }); 
  trackEvent("Lead", { reference }); 
  window.open(`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank"); 
  cart = []; 
  saveCart(); 
  renderCart(); 
  event.target.reset(); 
  $("#checkout-modal").close(); 
  showToast("توجدات الرسالة فـ واتساب");
});

$("#open-size").addEventListener("click", () => $("#size-modal").showModal());

$("#product-modal-add").addEventListener("click", () => {
  const product = getProduct(activeProductId);
  if (!product) return;
  const colorSelect = $(`#color-${activeProductId}`);
  const sizeSelect = $(`#size-${activeProductId}`);
  if (colorSelect) colorSelect.value = $("#product-modal-color").value;
  if (sizeSelect) sizeSelect.value = $("#product-modal-size").value;
  addToCart(activeProductId);
  $("#product-modal").close();
});

$("#product-modal-back").addEventListener("click", () => $("#product-modal").close());
$("#product-modal-prev").addEventListener("click", () => showProductImage(activeProductImageIndex - 1));
$("#product-modal-next").addEventListener("click", () => showProductImage(activeProductImageIndex + 1));
$("#product-modal-zoom").addEventListener("click", () => $("#product-modal-image").classList.toggle("is-zoomed"));

$("#size-form").addEventListener("submit", (event) => { 
  event.preventDefault(); 
  const data = Object.fromEntries(new FormData(event.target)); 
  const height = Number(data.height); 
  const weight = Number(data.weight); 
  const bmi = weight / ((height / 100) ** 2); 
  recommendedSize = bmi < 19 ? "S" : bmi < 23 ? "M" : bmi < 27 ? "L" : "XL"; 
  $("#recommendation").hidden = false; 
  $("#recommendation").textContent = `المقاس المقترح ليك هو: ${recommendedSize}. تقدر تبدلو قبل الإضافة للسلة.`; 
});

$("#bundle-order").addEventListener("click", () => { 
  [$("#male-select").value, $("#female-select").value].forEach((id) => addToCart(id, false)); 
  openCheckout(); 
});

renderProducts(); 
renderCart(); 
renderBuilder();
