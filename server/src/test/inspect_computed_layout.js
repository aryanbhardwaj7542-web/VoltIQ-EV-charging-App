import http from 'http';
import { spawn } from 'child_process';
import WebSocket from 'ws';

async function testViewport(width, height) {
  console.log(`\n======================================================`);
  console.log(`INSPECTING VIEWPORT: ${width}x${height}`);
  console.log(`======================================================`);

  const port = 9300 + Math.floor(Math.random() * 50);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
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

    // Wait until React mounts #app-top-header or .app-container
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

    await send('Runtime.evaluate', {
      expression: waitExpr,
      awaitPromise: true
    });

    const expr = `(() => {
      const getMetrics = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          selector,
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
          rectWidth: Math.round(rect.width),
          rectHeight: Math.round(rect.height),
          computedWidth: cs.width,
          computedHeight: cs.height,
          maxWidth: cs.maxWidth,
          display: cs.display,
          flexDirection: cs.flexDirection,
          margin: \`\${cs.marginTop} \${cs.marginRight} \${cs.marginBottom} \${cs.marginLeft}\`,
          padding: \`\${cs.paddingTop} \${cs.paddingRight} \${cs.paddingBottom} \${cs.paddingLeft}\`
        };
      };

      return {
        windowInnerWidth: window.innerWidth,
        windowInnerHeight: window.innerHeight,
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
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
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
    console.error('Inspection error:', err);
  } finally {
    chromeProc.kill();
  }

  return result;
}

async function run() {
  await testViewport(1920, 1080);
  await testViewport(1366, 768);
  await testViewport(1024, 768);
  await testViewport(768, 1024);
  await testViewport(390, 844);
}

run();
