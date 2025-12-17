// =========================================
// 1. 数据配置 (Data Configuration)
// =========================================

// 月份主题数据
const monthlyThemes = {
    1: { title: "Naxi Sanduo Festival", desc: "Celebrating the patron god of Naxi people.", img: "https://images.unsplash.com/photo-1547823065-4cbbb2d4d185?q=80&w=2070&auto=format&fit=crop" },
    4: { title: "Water Splashing Festival", desc: "The Dai New Year. Get ready to be soaked!", img: "https://images.unsplash.com/photo-1527236582914-874288b49520?q=80&w=2071&auto=format&fit=crop" },
    7: { title: "Torch Festival (Fire)", desc: "The wildest celebration of the Yi people.", img: "https://images.unsplash.com/photo-1516961642265-531546e84af2?q=80&w=1000&auto=format&fit=crop" },
    10: { title: "Golden Rice Terraces", desc: "Best time to view the Yuanyang Rice Terraces.", img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948&auto=format&fit=crop" },
    12: { title: "Cherry Blossoms", desc: "Wuliang Mountain covered in pink.", img: "https://plus.unsplash.com/premium_photo-1675805015392-28fd80c551ec?q=80&w=1932&auto=format&fit=crop" }
};

// POI 数据
const poiData = [
    { id: 1, name: "Erhai Lake View Hotel", lat: 25.69, lng: 100.16, cat: "Stay", score: 95, img: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?q=80&w=2074&auto=format&fit=crop", desc: "Luxury boutique hotel right by the lake.", fac: [1,1,1,1] },
    { id: 2, name: "Dali Old Town", lat: 25.69, lng: 100.14, cat: "Culture", score: 90, img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2070&auto=format&fit=crop", desc: "Historic town with traditional Bai architecture.", fac: [1,0,1,1] },
    { id: 3, name: "Jade Dragon Snow Mtn", lat: 27.09, lng: 100.20, cat: "Nature", score: 98, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop", desc: "Holy mountain of Naxi people. Cable car available.", fac: [0,1,0,1] },
    { id: 4, name: "Wild Yak Hotpot", lat: 27.80, lng: 99.72, cat: "Food", score: 75, img: "https://images.unsplash.com/photo-1549203767-a29c362145e6?q=80&w=2069&auto=format&fit=crop", desc: "Authentic Tibetan flavor, spicy and warming.", fac: [1,1,0,1] }
];

// Feed 数据
const feedData = [
    { id: 101, location: "Dali Old Town", title: "Hidden Gem in Dali! ☕️", user: "Traveler_A", likes: 342, img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop", content: "Found this amazing coffee shop..." },
    { id: 102, location: "Erhai Lake View Hotel", title: "Sunset at Erhai is Unreal 😍", user: "Photo_Fan", likes: 890, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948&auto=format&fit=crop", content: "Woke up to this view. Totally worth the price!" },
    { id: 103, location: "Wild Yak Hotpot", title: "Best Noodles I've ever had", user: "Foodie_X", likes: 120, img: "https://images.unsplash.com/photo-1587314168485-3236d6710814?q=80&w=1978&auto=format&fit=crop", content: "Spicy, savory, and perfect for the cold weather." },
    { id: 104, location: "Jade Dragon Snow Mtn", title: "Hiking Guide 2024", user: "Hiker_Joe", likes: 56, img: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?q=80&w=2070&auto=format&fit=crop", content: "Make sure you bring oxygen tanks." },
    { id: 105, location: "Dali Old Town", title: "Street Food Tour", user: "Yummy_Y", likes: 200, img: "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=1000&auto=format&fit=crop", content: "Trying the Xizhou Baba." }
];

// =========================================
// 2. 地图初始化 (Map Initialization)
// =========================================

// 定义初始视角常量，供 Reset 功能使用
const INITIAL_CENTER = [26.5, 100.5];
const INITIAL_ZOOM = 7;

const map = L.map('dash-map', { zoomControl: false }).setView(INITIAL_CENTER, INITIAL_ZOOM);
// Zoom 控件右上角
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

let markers = L.layerGroup().addTo(map);

// ★★★ 重置地图视角函数 ★★★
// 绑定到 HTML 中的 <button class="reset-map-btn">
window.resetMapView = function() {
    map.flyTo(INITIAL_CENTER, INITIAL_ZOOM, { 
        duration: 1.5,
        easeLinearity: 0.25
    });
};

// Popup HTML 生成
function createPopupContent(poi) {
    const icons = [
        { class: 'fa-solid fa-wifi', title: 'WiFi' },
        { class: 'fa-solid fa-square-parking', title: 'Parking' },
        { class: 'fa-solid fa-wheelchair', title: 'Accessible' },
        { class: 'fa-solid fa-utensils', title: 'Dining' }
    ];
    let facHtml = '';
    poi.fac.forEach((has, index) => {
        const statusClass = has ? 'active' : '';
        facHtml += `<i class="${icons[index].class} fac-item ${statusClass}"></i>`;
    });

    return `
        <div class="custom-popup">
            <div class="popup-left">
                <img src="${poi.img}" class="popup-img">
                <button class="official-link-btn">Official Link</button>
            </div>
            <div class="popup-right">
                <div class="popup-top-actions">
                    <div class="action-icon"><i class="fa-solid fa-location-arrow"></i></div>
                    <div class="action-icon"><i class="fa-solid fa-phone"></i></div>
                </div>
                <div class="popup-title">${poi.name}</div>
                <div class="popup-desc">${poi.desc}</div>
                <div class="popup-facilities">${facHtml}</div>
                
                <button class="popup-wishlist-btn" onclick="togglePopupWishlist(this, '${poi.name}')">
                    <i class="fa-regular fa-heart"></i> Add to Wishlist
                </button>
            </div>
        </div>
    `;
}

// =========================================
// 3. 核心：多选 Filter 与 地图渲染
// =========================================

// 使用 Set 存储当前选中的分类 (默认只有 'all')
let activeFilters = new Set(['all']);

function renderMap() {
    markers.clearLayers();
    
    poiData.forEach(p => {
        // 多选逻辑：如果是 'all' 或者当前分类在集合中，则显示
        if (activeFilters.has('all') || activeFilters.has(p.cat)) {
            
            let color = '#3494a6'; // Teal
            if (p.cat === 'Culture') color = '#1a3c5a'; // Dark Blue
            if (p.cat === 'Food') color = '#bf4328'; // Orange
            if (p.cat === 'Stay') color = '#e0b341'; // Yellow

            const marker = L.circleMarker([p.lat, p.lng], {
                radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1
            });
            
            marker.bindPopup(createPopupContent(p), {
                maxWidth: 320, minWidth: 320, className: 'custom-popup-wrapper'
            });

            // ★★★ 交互：点击 Marker -> 1. Zoom In 2. Filter Feed ★★★
            marker.on('click', function() {
                // 1. 镜头平滑拉近 (FlyTo)
                map.flyTo([p.lat, p.lng], 12, { duration: 1.5 });
                
                // 2. 右侧 YUNote 联动
                filterFeed(p.name);
            });
            
            markers.addLayer(marker);
        }
    });
}

// 初始化渲染
renderMap();

// 绑定筛选器点击事件
document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
        const selectedCat = e.target.dataset.cat;
        
        if (selectedCat === 'all') {
            // 点击 All -> 清空其他，只留 All
            activeFilters.clear();
            activeFilters.add('all');
        } else {
            // 点击具体分类 -> 先移除 All
            activeFilters.delete('all');
            
            // Toggle 逻辑：有则删，无则加
            if (activeFilters.has(selectedCat)) {
                activeFilters.delete(selectedCat);
            } else {
                activeFilters.add(selectedCat);
            }
            
            // 兜底逻辑：如果删光了，自动回退到 All
            if (activeFilters.size === 0) {
                activeFilters.add('all');
            }
        }
        
        // 更新 UI 样式 (DOM 操作)
        document.querySelectorAll('.tag').forEach(t => {
            const cat = t.dataset.cat;
            if (activeFilters.has(cat)) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // 重新渲染地图
        renderMap();
    });
});


// =========================================
// 4. YUNote & Feed 逻辑
// =========================================

const contentArea = document.getElementById('appContentArea');

function renderFeed(data) {
    let html = '<div class="feed-container">';
    if (data.length === 0) {
        html += '<div style="text-align:center;color:#999;margin-top:20px;">No posts yet for this location.</div>';
    } else {
        data.forEach(item => {
            html += `
                <div class="feed-card" onclick="showPostDetail(${item.id})">
                    <img src="${item.img}" class="feed-img">
                    <div class="feed-info">
                        <div class="feed-title">${item.title}</div>
                        <div class="feed-meta">
                            <div class="user-info">
                                <div class="avatar"></div><span>${item.user}</span>
                            </div>
                            <div class="like-box"><i class="fa-regular fa-heart"></i> ${item.likes}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    html += '</div>';
    contentArea.innerHTML = html;
}
renderFeed(feedData);

window.filterFeed = function(locationName) {
    const badge = document.getElementById('currentLocationTag');
    if(badge) badge.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${locationName}</span>`;
    const filtered = feedData.filter(item => item.location === locationName);
    renderFeed(filtered);
};

window.resetFeed = function() {
    const badge = document.getElementById('currentLocationTag');
    if(badge) badge.innerHTML = `<i class="fa-solid fa-globe"></i> <span>All Yunnan</span>`;
    renderFeed(feedData);
    // 重置 Feed 的同时也重置地图，体验更好
    resetMapView();
};

window.showPostDetail = function(id) {
    const item = feedData.find(p => p.id === id);
    if(!item) return;
    const detailHtml = `
        <div style="padding:20px; background:white; min-height:100%;">
            <div style="display:flex;align-items:center;margin-bottom:15px;color:#666;cursor:pointer;" onclick="renderFeed(feedData)">
                <i class="fa-solid fa-arrow-left"></i> &nbsp; Back
            </div>
            <img src="${item.img}" style="width:100%;border-radius:12px;margin-bottom:15px;">
            <h2 style="font-size:1.2rem;color:var(--color-dark-blue);margin-bottom:10px;">${item.title}</h2>
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:15px;">
                <div class="avatar" style="width:30px;height:30px;"></div>
                <span style="font-weight:bold;font-size:0.9rem;">${item.user}</span>
            </div>
            <p style="color:#555;line-height:1.6;">${item.content}</p>
        </div>
    `;
    contentArea.innerHTML = detailHtml;
};

window.showSection = function(section) {
    let html = '';
    if (section === 'message') html = '<div style="padding:20px;text-align:center;margin-top:50px;"><h3>Messages</h3><p>Chat feature coming soon.</p></div>';
    else if (section === 'create') html = '<div style="padding:20px;"><h3>Create Post</h3><textarea style="width:100%;height:100px;margin-top:10px;"></textarea></div>';
    else if (section === 'me') html = '<div style="padding:20px;"><h3>My Profile</h3><p>User: Explorer</p></div>';
    contentArea.innerHTML = html;
};

window.togglePopupWishlist = function(btn, name) {
    if (btn.classList.contains('added')) {
        btn.classList.remove('added');
        btn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Wishlist';
    } else {
        btn.classList.add('added');
        btn.innerHTML = '<i class="fa-solid fa-heart"></i> Added!';
    }
};

// =========================================
// 5. Chart & Slider Logic
// =========================================

const monthSlider = document.getElementById('monthSlider');
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Chart: Popularity
const ctxPop = document.getElementById('popChart').getContext('2d');
const popChart = new Chart(ctxPop, {
    type: 'bar',
    data: {
        labels: poiData.map(p => p.name.substring(0, 8) + '..'),
        datasets: [{ data: poiData.map(p => p.score), backgroundColor: '#1a3c5a', borderRadius: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: false }, scales: { x: { display: false }, y: { grid: { display: false } } } }
});

// Chart: Climate
const ctxTemp = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(ctxTemp, {
    type: 'bar',
    data: {
        labels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
        datasets: [
            { type: 'line', label: 'Temp', data: [8,10,13,16,19,22,23,22,20,17,12,9], borderColor: '#bf4328', pointBackgroundColor: '#bf4328', tension: 0.4, yAxisID: 'y' },
            { type: 'bar', label: 'Rain', data: [5,10,15,30,80,150,180,160,100,50,20,10], backgroundColor: 'rgba(52, 148, 166, 0.6)', yAxisID: 'y1' }
        ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { grid: { display: false } }, y: { display: false }, y1: { display: false } } }
});

function updateMonth(mIndex) {
    document.getElementById('monthDisplay').innerText = monthNames[mIndex];
    const monthKey = mIndex + 1;
    const theme = monthlyThemes[monthKey] || monthlyThemes[1];
    document.getElementById('themeTitle').innerText = theme.title;
    document.getElementById('themeDesc').innerText = theme.desc;
    document.getElementById('themeImg').src = theme.img;

    const pointColors = new Array(12).fill('rgba(191, 67, 40, 0.0)');
    pointColors[mIndex] = '#bf4328';
    tempChart.data.datasets[0].pointBackgroundColor = pointColors;
    tempChart.data.datasets[0].pointRadius = pointColors.map(c => c === '#bf4328' ? 5 : 0);

    // ★★★ 实时更新左侧气温/降水数值 ★★★
    if (tempChart.data.datasets.length >= 2) {
        const tEl = document.getElementById('dispTemp');
        const rEl = document.getElementById('dispRain');
        // 防止页面刚加载 DOM 还没出来时报错
        if(tEl) tEl.innerText = `${tempChart.data.datasets[0].data[mIndex]}°C`;
        if(rEl) rEl.innerText = `${tempChart.data.datasets[1].data[mIndex]}mm`;
    }
    tempChart.update();
}

monthSlider.addEventListener('input', (e) => updateMonth(e.target.value - 1));
updateMonth(6);