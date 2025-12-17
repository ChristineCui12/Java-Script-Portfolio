// 1. 初始化地图
const map = L.map('map', {
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false
}).setView([25.0, 101.5], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// 2. 定义每一幕的坐标和视角
const chapters = {
    0: { center: [25.0, 101.5], zoom: 7 },
    1: { center: [25.69, 100.16], zoom: 11 }, // Dali
    2: { center: [26.87, 100.23], zoom: 12 }, // Lijiang
    3: { center: [27.82, 99.70], zoom: 10 },  // Shangri-La
    4: { center: [27.0, 100.0], zoom: 8 }     // End
};

// 3. Scrollama 初始化
const scroller = scrollama();

scroller
    .setup({
        step: '.step',
        offset: 0.5,
        debug: false
    })
    .onStepEnter(response => {
        const stepIndex = response.element.dataset.step;
        const chapter = chapters[stepIndex];
        
        // CSS 动画激活
        document.querySelectorAll('.content-box').forEach(el => el.classList.remove('active'));
        response.element.querySelector('.content-box').classList.add('active');

        // 地图飞跃动画
        if (chapter) {
            map.flyTo(chapter.center, chapter.zoom, {
                duration: 2.0,
                easeLinearity: 0.25
            });
        }
    });