import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, addDoc, query, where, orderBy, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ★★★ 请替换为你自己的 Firebase 配置 ★★★
const firebaseConfig = {
    apiKey: "AIzaSyAMIT38af7QwiB9iiw8tl0v6k5pm0rZJ4I",
    authDomain: "yunnanodyssey.firebaseapp.com",
    projectId: "yunnanodyssey",
    storageBucket: "yunnanodyssey.firebasestorage.app",
    messagingSenderId: "184293573238",
    appId: "1:184293573238:web:3ae1188dfde704b6bad557",
    measurementId: "G-LDE0GNT38D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ★★★ 修改 1: 动态用户 ID (解决朋友电脑显示相同内容的问题) ★★★
function getLocalUserId() {
    let id = localStorage.getItem('yun_user_id');
    if (!id) {
        id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('yun_user_id', id);
    }
    return id;
}
const CURRENT_USER_ID = getLocalUserId();
console.log("Current User ID:", CURRENT_USER_ID);

// =========================================
// 1. 数据配置 & 辅助变量
// =========================================

const categoryColors = {
    "Nature": "#3494a6",   
    "Culture": "#1a3c5a",  
    "Food": "#bf4328",     
    "Stay": "#e0b341"      
};

const activityMapping = {
    "Floral & Splash": [3, 4, 5],     
    "Mushroom Hunting": [6, 7, 8],    
    "Golden Autumn": [9, 10, 11],     
    "Snow & Sun": [12, 1, 2]          
};

const monthlyThemes = {
    4: { title: "Floral & Splash", desc: "Experience the Water Splashing Festival and blooming flowers.", img: "https://images.unsplash.com/photo-1527236582914-874288b49520?q=80&w=2071" },
    7: { title: "Mushroom Hunting", desc: "The rainy season brings delicious wild mushrooms.", img: "https://images.unsplash.com/photo-1627387397274-04646a29792a?q=80&w=1974" },
    10: { title: "Golden Autumn", desc: "Golden rice terraces and harvest season.", img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948" },
    12: { title: "Snow & Sun", desc: "Enjoy the snow-capped mountains under the warm sun.", img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070" }
};

const categoryImages = {
    "Stay": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070",
    "Food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070",
    "Nature": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948",
    "Culture": "https://images.unsplash.com/photo-1547823065-4cbbb2d4d185?q=80&w=2070"
};

let poiData = []; 
let userWishlist = new Set();
let map, markers;
let popChart = null; 
let tempChart = null;
// 新增: 记录详情页当前地点的ID，用于点击Badge跳转
let currentDetailPostLocationId = null; 

// =========================================
// 2. 初始化与数据加载
// =========================================

async function initApp() {
    const INITIAL_CENTER = [24.5, 101.5]; 
    const INITIAL_ZOOM = 7;
    map = L.map('dash-map', { zoomControl: false }).setView(INITIAL_CENTER, INITIAL_ZOOM);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    markers = L.layerGroup().addTo(map);

    loadBoundaries();
    await syncWishlist();

    try {
        const response = await fetch('poi_new2_updated_with_pics.geojson');
        const geoJson = await response.json();
        
        poiData = geoJson.features.map(f => {
            const p = f.properties;
            const cost = parseInt(p.Buget?.replace(/[^0-9]/g, '') || 0);
            const activities = [p.Activity, p.Activity2, p.Activity3, p.Activity4].filter(Boolean);

            return {
                id: String(p.osm_id), 
                name: p.name_E || p.name,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
                cat: p.Filter,
                score: p.Score,
                desc: p.Description,
                img: p.Pic || categoryImages[p.Filter] || categoryImages['Nature'],
                fac: [p.Wifi, p.Parking, p.Accessibility, (p.Filter === 'Food' || p.Filter === 'Stay' ? 1 : 0)], 
                link: p.Link,
                tel: p.Tel_Number || "N/A", 
                time: p.Time || 1, 
                cost: cost,
                activities: activities
            };
        });

        initBaseCharts();
        renderMap();
        updateMonth(6); 
        loadAllPosts();
        initSearch();
        initCreatePostForm(); // ★★★ 初始化发帖表单逻辑

    } catch (error) {
        console.error("Failed to load POI data:", error);
    }
}

async function loadBoundaries() {
    try {
        const response = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/530000_full.json');
        const data = await response.json();
        const cityTranslations = { "昆明市": "Kunming", "曲靖市": "Qujing", "玉溪市": "Yuxi", "保山市": "Baoshan", "昭通市": "Zhaotong", "丽江市": "Lijiang", "普洱市": "Pu'er", "临沧市": "Lincang", "楚雄彝族自治州": "Chuxiong", "红河哈尼族彝族自治州": "Honghe", "文山壮族苗族自治州": "Wenshan", "西双版纳傣族自治州": "Xishuangbanna", "大理白族自治州": "Dali", "德宏傣族景颇族自治州": "Dehong", "怒江傈僳族自治州": "Nujiang", "迪庆藏族自治州": "Diqing" };

        L.geoJSON(data, {
            style: { color: '#636e72', weight: 1.2, opacity: 0.8, dashArray: '5, 5', fillOpacity: 0 },
            onEachFeature: function(feature, layer) {
                if (feature.properties && feature.properties.name) {
                    const enName = cityTranslations[feature.properties.name] || feature.properties.name;
                    layer.bindTooltip(enName, { permanent: false, direction: 'center', className: 'boundary-tooltip' });
                }
            }
        }).addTo(map);

    } catch (error) { console.error("Could not load boundary data:", error); }
}

// =========================================
// 3. 核心逻辑：Wishlist & Map & Filter
// =========================================

async function syncWishlist() {
    try {
        const docRef = doc(db, "users", CURRENT_USER_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const list = docSnap.data().wishlist || [];
            userWishlist = new Set(list.map(String)); 
        } else {
            await setDoc(docRef, { wishlist: [] });
        }
    } catch(e) { console.error("Wishlist sync error", e); }
}

window.toggleWishlist = async function(btn, poiId) {
    const poiIdStr = String(poiId);
    const docRef = doc(db, "users", CURRENT_USER_ID);
    
    if (userWishlist.has(poiIdStr)) {
        userWishlist.delete(poiIdStr);
        btn.classList.remove('added');
        btn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Wishlist';
        await updateDoc(docRef, { wishlist: arrayRemove(poiIdStr) });
    } else {
        userWishlist.add(poiIdStr);
        btn.classList.add('added');
        btn.innerHTML = '<i class="fa-solid fa-heart"></i> Added!';
        await updateDoc(docRef, { wishlist: arrayUnion(poiIdStr) });
    }
    renderMap(); 
};

let activeFilters = new Set(['all']);
let currentMonth = 7; 

function renderMap() {
    markers.clearLayers();
    
    let currentThemeTag = null;
    for (const [tag, months] of Object.entries(activityMapping)) {
        if (months.includes(currentMonth)) { currentThemeTag = tag; break; }
    }

    const visiblePois = [];

    poiData.forEach(p => {
        if (!activeFilters.has('all') && !activeFilters.has(p.cat)) return;

        visiblePois.push(p);

        let isActivityMatch = false;
        if (currentThemeTag && p.activities && p.activities.includes(currentThemeTag)) { isActivityMatch = true; }

        const opacity = isActivityMatch ? 1.0 : 0.4; 
        const radius = isActivityMatch ? 8 : 5;
        const finalOpacity = userWishlist.has(p.id) ? 1.0 : opacity;

        let marker;
        const isWishlisted = userWishlist.has(p.id);

        if (isWishlisted) {
            let iconHtml = '<i class="fa-solid fa-location-dot"></i>';
            if(p.cat === 'Nature') iconHtml = '<i class="fa-solid fa-mountain"></i>';
            if(p.cat === 'Culture') iconHtml = '<i class="fa-solid fa-landmark"></i>';
            if(p.cat === 'Food') iconHtml = '<i class="fa-solid fa-utensils"></i>';
            if(p.cat === 'Stay') iconHtml = '<i class="fa-solid fa-bed"></i>';
            const size = isActivityMatch ? 34 : 28;
            
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="marker-pin marker-wishlist cat-${p.cat}" style="width:${size}px;height:${size}px;font-size:${size/2}px;opacity:${finalOpacity}">${iconHtml}</div>`,
                iconSize: [size, size], iconAnchor: [size/2, size/2]
            });
            marker = L.marker([p.lat, p.lng], { icon: customIcon });
        } else {
            let color = categoryColors[p.cat] || '#3494a6';
            marker = L.circleMarker([p.lat, p.lng], {
                radius: radius, fillColor: color, color: '#fff', weight: 1, fillOpacity: finalOpacity, opacity: finalOpacity
            });
        }
        
        marker.bindPopup(createPopupContent(p, isWishlisted), { maxWidth: 400, minWidth: 300, className: 'custom-popup-wrapper' });
        p.markerRef = marker;

        marker.on('click', function() {
            map.flyTo([p.lat, p.lng], 13, { duration: 1.5 });
            window.loadPostsForLocation(p.id, p.name);
        });
        
        markers.addLayer(marker);
    });

    updateRankChart(visiblePois);
}

function createPopupContent(poi, isAdded) {
    const btnClass = isAdded ? 'added' : '';
    const btnText = isAdded ? '<i class="fa-solid fa-heart"></i> Added!' : '<i class="fa-regular fa-heart"></i> Add to Wishlist';
    const iconsConfig = [{ class: 'fa-solid fa-wifi', title: 'WiFi' }, { class: 'fa-solid fa-square-parking', title: 'Parking' }, { class: 'fa-solid fa-wheelchair', title: 'Accessible' }, { class: 'fa-solid fa-utensils', title: 'Dining' }];
    
    let facHtml = '';
    poi.fac.forEach((has, index) => {
        const statusClass = has === 1 ? 'active' : '';
        facHtml += `<i class="${iconsConfig[index].class} fac-item ${statusClass}" title="${iconsConfig[index].title}"></i>`;
    });

    const phoneOnClick = `alert('Telephone Number: ${poi.tel}')`;

    return `
        <div class="custom-popup">
            <div class="popup-left"><img src="${poi.img}" class="popup-img" onerror="this.src='https://via.placeholder.com/120'"><a href="${poi.link}" target="_blank" class="official-link-btn">Trip.com Link</a></div>
            <div class="popup-right">
                <div class="popup-top-actions"><div class="action-icon" onclick="${phoneOnClick}" title="Click to see number"><i class="fa-solid fa-phone"></i></div></div>
                <div class="popup-title">${poi.name}</div>
                <div class="popup-meta-row"><span><i class="fa-solid fa-star"></i> Score: ${poi.score}</span><span style="color:#ddd">|</span><span><i class="fa-solid fa-sack-dollar"></i> $${poi.cost}</span></div>
                <div class="popup-meta-row"><span><i class="fa-regular fa-clock"></i> Rec. Time: ${poi.time} h</span></div>
                <div class="popup-desc">${poi.desc}</div>
                <div class="popup-facilities">${facHtml}</div>
                <button class="popup-wishlist-btn ${btnClass}" onclick="window.toggleWishlist(this, '${poi.id}')">${btnText}</button>
            </div>
        </div>`;
}

// =========================================
// 4. UI 交互 & 图表 & 搜索
// =========================================

function initSearch() {
    const searchInput = document.getElementById('poiSearchInput');
    const resultsList = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        resultsList.innerHTML = '';
        if (val.length < 1) { resultsList.classList.remove('show'); return; }

        const matches = poiData.filter(p => p.name.toLowerCase().includes(val)).slice(0, 6); 

        if (matches.length > 0) {
            matches.forEach(p => {
                const li = document.createElement('li');
                li.className = 'search-item';
                li.innerHTML = `<span>${p.name}</span> <span class="search-item-cat">${p.cat}</span>`;
                li.onclick = () => {
                    searchInput.value = '';
                    resultsList.classList.remove('show');
                    if(!activeFilters.has('all') && !activeFilters.has(p.cat)) {
                        activeFilters.clear(); activeFilters.add('all');
                        document.querySelectorAll('.tag').forEach(t => t.classList.toggle('active', t.dataset.cat === 'all'));
                        renderMap(); 
                    }
                    map.flyTo([p.lat, p.lng], 14, { duration: 1.5 });
                    setTimeout(() => { if (p.markerRef) { p.markerRef.openPopup(); window.loadPostsForLocation(p.id, p.name); } }, 1000);
                };
                resultsList.appendChild(li);
            });
            resultsList.classList.add('show');
        } else { resultsList.classList.remove('show'); }
    });

    document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrapper')) { resultsList.classList.remove('show'); } });
}

document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
        const selectedCat = e.target.dataset.cat;
        if (selectedCat === 'all') { activeFilters.clear(); activeFilters.add('all'); } 
        else {
            activeFilters.delete('all');
            if (activeFilters.has(selectedCat)) activeFilters.delete(selectedCat); else activeFilters.add(selectedCat);
            if (activeFilters.size === 0) activeFilters.add('all');
        }
        document.querySelectorAll('.tag').forEach(t => { const cat = t.dataset.cat; t.classList.toggle('active', activeFilters.has(cat)); });
        renderMap();
    });
});

const monthSlider = document.getElementById('monthSlider');
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function updateMonth(mIndex) {
    currentMonth = mIndex + 1;
    document.getElementById('monthDisplay').innerText = monthNames[mIndex];

    let themeKey = 4;
    if (monthlyThemes[currentMonth]) themeKey = currentMonth;
    else if ([12, 1, 2].includes(currentMonth)) themeKey = 12;
    else if ([6, 7, 8].includes(currentMonth)) themeKey = 7;
    else if ([9, 10, 11].includes(currentMonth)) themeKey = 10;

    const theme = monthlyThemes[themeKey];
    document.getElementById('themeTitle').innerText = theme.title;
    document.getElementById('themeDesc').innerText = theme.desc;
    document.getElementById('themeImg').src = theme.img;

    if (tempChart) {
        const pointColors = new Array(12).fill('rgba(191, 67, 40, 0.0)');
        pointColors[mIndex] = '#bf4328';
        tempChart.data.datasets[0].pointBackgroundColor = pointColors;
        tempChart.data.datasets[0].pointRadius = pointColors.map(c => c === '#bf4328' ? 5 : 0);
        tempChart.update();
        document.getElementById('dispTemp').innerText = `${tempChart.data.datasets[0].data[mIndex]}°C`;
        document.getElementById('dispRain').innerText = `${tempChart.data.datasets[1].data[mIndex]}mm`;
    }
    renderMap();
}

monthSlider.addEventListener('input', (e) => updateMonth(e.target.value - 1));

function initBaseCharts() {
    const ctxPop = document.getElementById('popChart').getContext('2d');
    popChart = new Chart(ctxPop, { type: 'bar', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: false }, scales: { x: { display: false }, y: { grid: { display: false } } } } });

    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(ctxTemp, { type: 'bar', data: { labels: ['J','F','M','A','M','J','J','A','S','O','N','D'], datasets: [{ type: 'line', label: 'Temp', data: [8,10,13,16,19,22,23,22,20,17,12,9], borderColor: '#bf4328', pointBackgroundColor: '#bf4328', tension: 0.4, yAxisID: 'y' }, { type: 'bar', label: 'Rain', data: [5,10,15,30,80,150,180,160,100,50,20,10], backgroundColor: 'rgba(52, 148, 166, 0.6)', yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { grid: { display: false } }, y: { display: false }, y1: { display: false } } } });
}

function updateRankChart(visiblePois) {
    if (!popChart) return;
    const sorted = [...visiblePois].sort((a, b) => b.score - a.score);
    const top10 = sorted.slice(0, 10);
    const labels = top10.map(p => p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name);
    const data = top10.map(p => p.score);
    const colors = top10.map(p => categoryColors[p.cat] || '#3494a6'); 
    popChart.data.labels = labels;
    popChart.data.datasets = [{ data: data, backgroundColor: colors, borderRadius: 4, barPercentage: 0.7 }];
    popChart.update();
}

// ★★★ 修改 2: Home 键核心逻辑 (重置所有状态) ★★★
window.handleHomeClick = function() {
    // 1. 地图归位
    map.flyTo([24.5, 101.5], 7, { duration: 1.5 });
    
    // 2. 清除选中状态
    currentSelectedLocationId = null;
    
    // 3. 右侧面板重置
    window.loadAllPosts(); // 载入全云南帖子
    window.showSection('home'); // 确保显示 Feed 页
    
    // 4. 重置地图过滤器 UI
    document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
    document.querySelector('.tag[data-cat="all"]').classList.add('active');
    activeFilters.clear(); activeFilters.add('all');
    renderMap();
};

window.resetMapView = function() {
    window.handleHomeClick();
};

// =========================================
// 5. Yunstagram (右侧) & 发帖逻辑
// =========================================

const contentArea = document.getElementById('appContentArea');
const createPostContainer = document.getElementById('createPostContainer');
let currentSelectedLocationId = null;

window.loadPostsForLocation = function(poiId, poiName) {
    currentSelectedLocationId = poiId;
    updateLocationBadge(poiName, 'location', false);
    fetchPosts(poiId);
};

window.loadAllPosts = function() {
    currentSelectedLocationId = null;
    updateLocationBadge('All Yunnan', 'globe', false);
    fetchPosts(null);
};

window.loadMyPosts = function() {
    updateLocationBadge('My Posts', 'user', false);
    fetchPosts(null, true);
};

// ★★★ 修改 3: 点击 Badge 跳转逻辑 ★★★
window.handleLocationBadgeClick = function() {
    if (contentArea.querySelector('.detail-view-container') && currentDetailPostLocationId) {
        const loc = poiData.find(p => p.id === currentDetailPostLocationId);
        if (loc) window.loadPostsForLocation(loc.id, loc.name);
    }
};

function updateLocationBadge(text, iconType, clickable) {
    const badge = document.getElementById('currentLocationTag');
    let icon = iconType === 'location' ? 'fa-location-dot' : (iconType === 'user' ? 'fa-user' : 'fa-globe');
    if(badge) {
        badge.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${text}</span>`;
        if (clickable) badge.classList.add('clickable'); else badge.classList.remove('clickable');
    }
}

function fetchPosts(locationId = null, onlyMine = false) {
    contentArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Loading feeds...</div>';
    let q = collection(db, "posts");
    let constraints = [orderBy("timestamp", "desc")];
    if (locationId) constraints.push(where("locationId", "==", String(locationId)));
    if (onlyMine) constraints.push(where("userId", "==", CURRENT_USER_ID));
    
    const finalQuery = query(q, ...constraints);
    onSnapshot(finalQuery, (snapshot) => {
        let posts = [];
        snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
        renderFeedHTML(posts);
    });
}

function renderFeedHTML(posts) {
    if (posts.length === 0) { contentArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">No posts found.</div>'; return; }
    let html = '<div class="feed-container">';
    posts.forEach(item => {
        const likeCount = item.likes ? item.likes.length : 0;
        html += `
            <div class="feed-card" onclick="window.showPostDetail('${item.id}')">
                <img src="${item.img}" class="feed-img">
                <div class="feed-info">
                    <div class="feed-title">${item.title}</div>
                    <div class="feed-meta">
                        <div class="user-info"><div class="avatar"></div><span>${item.user}</span></div>
                        <div class="like-box"><i class="fa-regular fa-heart"></i> ${likeCount}</div>
                    </div>
                </div>
            </div>`;
    });
    html += '</div>';
    contentArea.innerHTML = html;
}

// ★★★ 修改 4: 帖子详情页 (增加点赞、评论、Back按钮) ★★★
window.showPostDetail = async function(docId) {
    const docRef = doc(db, "posts", docId);
    onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const item = { id: docSnap.id, ...docSnap.data() };
        currentDetailPostLocationId = item.locationId;
        updateLocationBadge(item.locationName || "Unknown Location", "location", true);
        const likes = item.likes || [];
        const isLiked = likes.includes(CURRENT_USER_ID);
        const comments = item.comments || [];
        let commentsHtml = comments.map(c => `<div class="comment-item"><span class="comment-user">${c.user}:</span>${c.text}</div>`).join('');
        
        const detailHtml = `
            <div class="detail-view-container" style="padding:20px; background:white; min-height:100%;">
                <div style="display:flex;align-items:center;margin-bottom:15px;color:#666;cursor:pointer;" onclick="window.showSection('home')"><i class="fa-solid fa-arrow-left"></i> &nbsp; Back to Feed</div>
                <img src="${item.img}" style="width:100%;border-radius:12px;margin-bottom:15px;">
                <h2 style="font-size:1.2rem;margin-bottom:5px;">${item.title}</h2>
                <div style="font-size:0.8rem;color:#999;margin-bottom:10px;"><i class="fa-solid fa-location-dot"></i> ${item.locationName}</div>
                <div style="display:flex;gap:10px;align-items:center;margin-bottom:15px;"><div class="avatar" style="width:30px;height:30px;"></div><span style="font-weight:bold;">${item.user}</span></div>
                <p style="color:#555;line-height:1.5;">${item.content}</p>
                <div class="detail-actions">
                    <button class="${isLiked ? 'action-btn liked' : 'action-btn'}" onclick="window.toggleLike('${item.id}')"><i class="${isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i> ${likes.length} Likes</button>
                    <button class="action-btn"><i class="fa-regular fa-comment"></i> ${comments.length} Comments</button>
                </div>
                <div class="comments-section">
                    <div class="comment-input-box"><input type="text" id="commentInput-${item.id}" class="comment-input" placeholder="Add a comment..."><button class="comment-submit-btn" onclick="window.submitComment('${item.id}')">Post</button></div>
                    <div class="comment-list">${commentsHtml}</div>
                </div>
            </div>`;
        contentArea.innerHTML = detailHtml;
    });
};

window.toggleLike = async function(postId) {
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
        const likes = docSnap.data().likes || [];
        if(likes.includes(CURRENT_USER_ID)) await updateDoc(docRef, { likes: arrayRemove(CURRENT_USER_ID) });
        else await updateDoc(docRef, { likes: arrayUnion(CURRENT_USER_ID) });
    }
};

window.submitComment = async function(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const text = input.value.trim();
    if(!text) return;
    await updateDoc(doc(db, "posts", postId), { comments: arrayUnion({ user: "User " + CURRENT_USER_ID.substr(-3), text: text, time: Timestamp.now() }) });
    input.value = '';
};

window.showSection = function(section) {
    createPostContainer.style.display = 'none';
    contentArea.style.display = 'block';
    
    if (section === 'home') {
        if (!currentSelectedLocationId) window.loadAllPosts();
        else fetchPosts(currentSelectedLocationId);
    } else if (section === 'create') {
        contentArea.style.display = 'none';
        createPostContainer.style.display = 'flex';
        resetCreateForm();
    } else if (section === 'me') {
        window.loadMyPosts();
    }
};

// ★★★ 修改 5: 发帖表单逻辑 (手动搜索 + 自动填充 + Base64图片) ★★★
function initCreatePostForm() {
    // 1. 图片预览与Base64转换
    const imgInput = document.getElementById('postImageInput');
    const preview = document.getElementById('imgPreview');
    if (imgInput) {
        imgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.style.backgroundImage = `url(${e.target.result})`;
                    preview.style.display = 'block';
                    preview.dataset.base64 = e.target.result; // 暂存 Base64
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 2. 地点搜索逻辑
    const locInput = document.getElementById('newPostLocation');
    const locResults = document.getElementById('postLocationResults');
    if (locInput) {
        locInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            locResults.innerHTML = '';
            if(val.length < 1) { locResults.classList.remove('show'); return; }
            
            const matches = poiData.filter(p => p.name.toLowerCase().includes(val)).slice(0, 8);
            if (matches.length > 0) {
                matches.forEach(p => {
                    const li = document.createElement('li');
                    li.className = 'search-item';
                    li.innerHTML = `<span>${p.name}</span>`;
                    li.onclick = () => {
                        locInput.value = p.name;
                        document.getElementById('newPostLocationId').value = p.id;
                        locResults.classList.remove('show');
                    };
                    locResults.appendChild(li);
                });
                locResults.classList.add('show');
            } else { locResults.classList.remove('show'); }
        });
        
        document.addEventListener('click', (e) => { if (!e.target.closest('.location-input-wrapper')) locResults.classList.remove('show'); });
    }
}

function resetCreateForm() {
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostContent').value = '';
    document.getElementById('postImageInput').value = '';
    const preview = document.getElementById('imgPreview');
    preview.style.display = 'none';
    delete preview.dataset.base64;
    
    const locInput = document.getElementById('newPostLocation');
    const locIdInput = document.getElementById('newPostLocationId');
    
    // 如果是从地图 Marker 点进来的，预填
    if (currentSelectedLocationId) {
        const loc = poiData.find(p => p.id === currentSelectedLocationId);
        if (loc) {
            locInput.value = loc.name;
            locIdInput.value = loc.id;
        }
    } else {
        locInput.value = '';
        locIdInput.value = '';
    }
}

window.submitNewPost = async function() {
    const title = document.getElementById('newPostTitle').value;
    const content = document.getElementById('newPostContent').value;
    const locId = document.getElementById('newPostLocationId').value;
    const locName = document.getElementById('newPostLocation').value;
    const imgBase64 = document.getElementById('imgPreview').dataset.base64;

    if (!title) return alert("Please add a title!");
    if (!content) return alert("Write something!");
    if (!locId || !locName) return alert("Please search and click a valid location from the list!");

    // 使用 Base64 (如果未上传则使用默认图)
    const finalImg = imgBase64 || "https://images.unsplash.com/photo-1504280590459-f2f293b9e597?q=80&w=2070";

    try {
        await addDoc(collection(db, "posts"), {
            title: title, content: content,
            locationId: String(locId), locationName: locName,
            userId: CURRENT_USER_ID, user: "User " + CURRENT_USER_ID.substr(-3),
            likes: [], comments: [], img: finalImg, timestamp: Timestamp.now()
        });
        window.handleHomeClick(); // 发完帖直接回全云南首页
    } catch (e) { 
        alert("Failed to post: " + e.message + " (Image might be too large)"); 
    }
};

window.resetFeed = function() {
    window.handleHomeClick();
};

initApp();