// ★★★ 请在此处填入你的 Mapbox Access Token ★★★
// 如果留空，代码会自动降级使用直线连接，不会报错。
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2NvdGhpcyIsImEiOiJjaWp1Y2ltYmUwMDBicmJrdDQ4ZDBkaGN4In0.sbihZCZJ56-fsFNKHXF8YQ'; 

// 1. 数据配置
const poiData = [
    { id: 1, name: "Jade Dragon Snow Mtn", lat: 27.09, lng: 100.20, price: 40, ele: 4600, cat: "Nature", isWishlist: true }, 
    { id: 2, name: "Lijiang Old Town", lat: 26.87, lng: 100.23, price: 12, ele: 2400, cat: "Culture", isWishlist: true },
    { id: 3, name: "Shangri-La", lat: 27.82, lng: 99.70, price: 0, ele: 3160, cat: "Culture", isWishlist: true },
    { id: 4, name: "Shaxi Old Town", lat: 26.32, lng: 99.85, price: 0, ele: 2100, cat: "Culture", isWishlist: false },
    { id: 5, name: "Tiger Leaping Gorge", lat: 27.21, lng: 100.13, price: 15, ele: 1800, cat: "Nature", isWishlist: true },
    { id: 6, name: "Wild Yak Hotpot", lat: 27.80, lng: 99.72, price: 30, ele: 3200, cat: "Food", isWishlist: false },
    { id: 7, name: "Erhai Lake", lat: 25.69, lng: 100.16, price: 0, ele: 1972, cat: "Nature", isWishlist: false }
];

let dayCount = 3; // 当前总天数

// 2. 初始化地图
const map = L.map('map', { zoomControl: false }).setView([26.8, 100.2], 8);
L.control.zoom({ position: 'topleft' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

let routeLayer = L.layerGroup().addTo(map);

// 3. 渲染 Marker (动态 Popup 内容)
poiData.forEach(p => {
    let cssClass = 'marker-gray';
    let iconHtml = '<i class="fa-solid fa-location-dot"></i>';
    
    if (p.isWishlist) {
        cssClass = `marker-wishlist cat-${p.cat}`; 
        if(p.cat === 'Nature') iconHtml = '<i class="fa-solid fa-mountain"></i>';
        if(p.cat === 'Culture') iconHtml = '<i class="fa-solid fa-landmark"></i>';
        if(p.cat === 'Food') iconHtml = '<i class="fa-solid fa-utensils"></i>';
    }

    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin ${cssClass}">${iconHtml}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    const marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);

    // ★★★ 关键修改：动态绑定 Popup ★★★
    // 每次点击时，根据当前的 dayCount 生成下拉选项
    marker.bindPopup(() => {
        let optionsHtml = '';
        for(let i=1; i<=dayCount; i++) {
            optionsHtml += `<option value="day${i}">Day ${i}</option>`;
        }

        return `
            <div style="text-align:center; min-width:160px;">
                <h4 style="margin:0 0 5px 0;color:#1a3c5a;">${p.name}</h4>
                <p style="margin:0 0 8px 0;font-size:12px;color:#666;">Ele: ${p.ele}m | Cost: $${p.price}</p>
                
                <div class="popup-controls">
                    <select id="targetDaySelect-${p.id}" class="popup-day-select">
                        ${optionsHtml}
                    </select>
                    <button class="popup-add-btn" onclick="addToPlan(${p.id})">Add</button>
                </div>
            </div>
        `;
    });
});

// 4. 日期计算逻辑 (Update Default Date)
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');
const totalDaysDisplay = document.getElementById('totalDaysDisplay');

function updateDays() {
    const d1 = new Date(dateFrom.value);
    const d2 = new Date(dateTo.value);
    
    if(d1 && d2 && d2 >= d1) {
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        totalDaysDisplay.innerText = diffDays + " Days";
    } else {
        totalDaysDisplay.innerText = "--";
    }
}
dateFrom.addEventListener('change', updateDays);
dateTo.addEventListener('change', updateDays);
updateDays(); 

// 5. 添加地点逻辑 (读取下拉框的值)
window.addToPlan = function(id) {
    const p = poiData.find(x => x.id === id);
    if (!p) return;

    // ★★★ 读取 Popup 里的 Select 值 ★★★
    const selectEl = document.getElementById(`targetDaySelect-${id}`);
    const targetDayId = selectEl ? selectEl.value : 'day1';
    const list = document.getElementById(targetDayId);

    const empty = list.querySelector('.empty-state');
    if (empty) empty.style.display = 'none';

    const li = document.createElement('li');
    li.className = 'trip-item';
    li.dataset.lat = p.lat;
    li.dataset.lng = p.lng;
    li.dataset.ele = p.ele;
    li.dataset.price = p.price;
    li.dataset.name = p.name;
    
    li.innerHTML = `
        <div class="item-info">
            <span class="item-name">${p.name}</span>
            <span class="item-meta">${p.ele}m</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
            <span class="item-price">$${p.price}</span>
            <i class="fa-solid fa-xmark item-remove" onclick="removePoint(this)"></i>
        </div>
    `;

    list.appendChild(li);
    map.closePopup();
    updateGlobalState(true); 
};

window.removePoint = function(el) {
    el.closest('li').remove();
    updateGlobalState(false);
};

// 6. 新增 Add Day
window.addNewDay = function() {
    dayCount++;
    const container = document.getElementById('daysContainer');
    
    const div = document.createElement('div');
    div.className = 'day-section';
    div.innerHTML = `
        <div class="day-title">DAY ${dayCount}: NEW ADVENTURE</div>
        <ul class="waypoint-list" id="day${dayCount}">
            <li class="empty-state">Drag items here...</li>
        </ul>
    `;
    container.appendChild(div);
    
    new Sortable(document.getElementById(`day${dayCount}`), {
        group: 'shared', animation: 150, onEnd: () => updateGlobalState(false)
    });
};

// 7. 拖拽初始化
['day1', 'day2', 'day3'].forEach(id => {
    new Sortable(document.getElementById(id), {
        group: 'shared', animation: 150, onEnd: () => updateGlobalState(false)
    });
});

// 8. 全局状态更新
async function updateGlobalState(isNewAdd) {
    let totalCost = 0;
    let points = [];
    
    document.querySelectorAll('.trip-item').forEach(item => {
        const price = parseInt(item.dataset.price);
        totalCost += price;
        points.push({
            lat: parseFloat(item.dataset.lat),
            lng: parseFloat(item.dataset.lng),
            ele: parseInt(item.dataset.ele),
            name: item.dataset.name
        });
    });

    const costEl = document.getElementById('totalCostDisplay');
    costEl.innerText = `$${totalCost}`;
    document.getElementById('totalStopsDisplay').innerText = points.length;

    const budgetLimit = parseInt(document.getElementById('budgetInput').value) || 0;
    if (totalCost > budgetLimit) {
        costEl.classList.add('over-budget');
        if (isNewAdd) alert(`⚠️ Over Budget!\nCurrent: $${totalCost} / Limit: $${budgetLimit}`);
    } else {
        costEl.classList.remove('over-budget');
    }

    // 使用 Mapbox API 更新路线
    await updateRoute(points);
    updateChart(points);
}

document.getElementById('budgetInput').addEventListener('input', () => updateGlobalState(false));

// ★★★ 9. Mapbox Routing Logic (核心更新) ★★★
async function updateRoute(points) {
    routeLayer.clearLayers();
    if(points.length < 2) return;

    // 如果没有 Token，使用直线降级
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'YOUR_TOKEN_HERE') {
        console.warn("No Mapbox Token provided. Using simple polylines.");
        const latlngs = points.map(p => [p.lat, p.lng]);
        L.polyline(latlngs, { color: '#4cd137', weight: 4 }).addTo(routeLayer);
        return;
    }

    // 构建 Mapbox API 请求
    // 格式: lng,lat;lng,lat
    const coordsString = points.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const routeGeoJSON = data.routes[0].geometry;
            
            // 绘制真实路线
            L.geoJSON(routeGeoJSON, {
                style: { color: '#4cd137', weight: 5, opacity: 0.8 }
            }).addTo(routeLayer);
        }
    } catch (e) {
        console.error("Mapbox API Error:", e);
        // 出错时回退到直线
        const latlngs = points.map(p => [p.lat, p.lng]);
        L.polyline(latlngs, { color: '#4cd137', weight: 4 }).addTo(routeLayer);
    }
}

// Chart
let myChart = null;
function updateChart(points) {
    const ctx = document.getElementById('elevationChart').getContext('2d');
    if (myChart) myChart.destroy();
    
    const labels = points.map(p => p.name);
    const data = points.map(p => p.ele);
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Elevation (m)', data: data,
                borderColor: '#4cd137', backgroundColor: 'rgba(76, 209, 55, 0.2)',
                fill: true, tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: false },
            scales: { x: { display: false }, y: { display: true } }
        }
    });
}