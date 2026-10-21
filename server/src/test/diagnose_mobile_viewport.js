import http from 'http';
import { spawn } from 'child_process';
import WebSocket from 'ws';

async function diagnoseViewport(width, height) {
  console.log(`\n======================================================`);
  console.log(`DIAGNOSING VIEWPORT: ${width}x${height}`);
  console.log(`======================================================`);

  const port = 9400 + Math.floor(Math.random() * 50);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    'http://localhost:5173'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  let result = null;
  try {
    const listData = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json`, res => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    const page = listData.find(t => t.type === 'page');
    if (!page || !page.webSocketDebuggerUrl) {
      throw new Error('No page WebSocket URL found');
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    let reqId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.id === id) {
          ws.off('message', handler);
          resolve(data.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    // 1. Set explicit Device Metrics Override in Chrome DevTools Protocol
    await send('Emulation.setDeviceMetricsOverride', {
      width: width,
      height: height,
      deviceScaleFactor: 1,
      mobile: width < 1024,
      fitWindow: false
    });

    // 2. Wait until React mounts #app-top-header and #voltiq-leaflet-map
    const waitExpr = `new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('.app-container') && document.querySelector('#voltiq-leaflet-map')) {
          resolve(true);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })`;

    await send('Runtime.evaluate', {
      expression: waitExpr,
      awaitPromise: true
    });

    // Allow layout to stabilize
    await new Promise(r => setTimeout(r, 1000));

    // 3. Inspect computed layout and any overflowing elements
    const expr = `(() => {
      const docEl = document.documentElement;
      const body = document.body;

      const getMetrics = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          selector,
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
          rectWidth: Math.round(rect.width * 100) / 100,
          rectHeight: Math.round(rect.height * 100) / 100,
          computedWidth: cs.width,
          computedHeight: cs.height,
          maxWidth: cs.maxWidth,
          minWidth: cs.minWidth,
          display: cs.display,
          flexDirection: cs.flexDirection,
          overflow: cs.overflow,
          overflowX: cs.overflowX
        };
      };

      // Find all elements that exceed window.innerWidth
      const overflowingElements = [];
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        // Ignore html/body or elements that are meant to scroll horizontally
        if (el === docEl || el === body) continue;

        const cs = window.getComputedStyle(el);
        // Exclude elements whose parent handles horizontal scroll
        const isScrollRow = cs.overflowX === 'auto' || cs.overflowX === 'scroll';

        if (rect.right > window.innerWidth + 1 || rect.width > window.innerWidth + 1) {
          overflowingElements.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || undefined,
            className: el.className ? (typeof el.className === 'string' ? el.className.slice(0, 80) : 'svg-class') : undefined,
            rectWidth: Math.round(rect.width),
            rectLeft: Math.round(rect.left),
            rectRight: Math.round(rect.right),
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            computedWidth: cs.width,
            minWidth: cs.minWidth,
            maxWidth: cs.maxWidth,
            overflowX: cs.overflowX
          });
        }
      }

      return {
        windowInnerWidth: window.innerWidth,
        windowInnerHeight: window.innerHeight,
        docClientWidth: docEl.clientWidth,
        docScrollWidth: docEl.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        horizontalOverflow: docEl.scrollWidth > window.innerWidth,
        mediaMatch1024: window.matchMedia('(min-width: 1024px)').matches,
        mediaMatch768: window.matchMedia('(min-width: 768px)').matches,
        root: getMetrics('#root'),
        appContainer: getMetrics('.app-container'),
        topHeader: getMetrics('#app-top-header'),
        driverShell: getMetrics('#driver-mobile-view'),
        mobileViewWrapper: getMetrics('.mobile-view-wrapper'),
        sidebarPanel: getMetrics('#driver-sidebar-panel'),
        mapPanel: getMetrics('#driver-map-panel'),
        leafletMap: getMetrics('#voltiq-leaflet-map'),
        bottomNav: getMetrics('#driver-bottom-nav'),
        viewModeToggle: getMetrics('#view-mode-toggle'),
        overflowingElementsCount: overflowingElements.length,
        overflowingElements: overflowingElements.slice(0, 15)
      };
    })()`;

    const evalResult = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });

    result = evalResult.result.value;
    console.log(JSON.stringify(result, null, 2));

    ws.close();
  } catch (err) {
    console.error('Diagnosis error:', err);
  } finally {
    chromeProc.kill();
  }

  return result;
}

async function run() {
  await diagnoseViewport(390, 844);
  await diagnoseViewport(430, 932);
  await diagnoseViewport(768, 1024);
  await diagnoseViewport(1366, 768);
  await diagnoseViewport(1920, 1080);
}

run();
