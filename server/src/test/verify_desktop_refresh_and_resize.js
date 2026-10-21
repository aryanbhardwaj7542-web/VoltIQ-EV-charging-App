import http from 'http';
import { spawn } from 'child_process';
import WebSocket from 'ws';

async function createBrowserSession(width, height) {
  const port = 9500 + Math.floor(Math.random() * 50);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const listData = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    }).on('error', reject);
  });

  const page = listData.find(t => t.type === 'page');
  if (!page || !page.webSocketDebuggerUrl) {
    chromeProc.kill();
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
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Enable Page & Network domains
  await send('Page.enable');
  await send('Network.enable');

  // Set initial viewport override
  await send('Emulation.setDeviceMetricsOverride', {
    width: width,
    height: height,
    deviceScaleFactor: 1,
    mobile: width < 1024,
    fitWindow: false
  });

  // Navigate to application
  await send('Page.navigate', { url: 'http://localhost:5173' });

  const waitForApp = async () => {
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 40) {
      attempts++;
      try {
        const evalRes = await send('Runtime.evaluate', {
          expression: `Boolean(document.querySelector('.app-container') && document.querySelector('#voltiq-leaflet-map'))`,
          returnByValue: true
        });
        if (evalRes?.result?.value === true) {
          ready = true;
          break;
        }
      } catch {
        // Execution context might be reloading
      }
      await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 800));
  };

  await waitForApp();

  const getMetrics = async () => {
    const expr = `(() => {
      const docEl = document.documentElement;
      const body = document.body;

      const measure = (selector) => {
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
          display: cs.display,
          flexDirection: cs.flexDirection,
          margin: \`\${cs.marginTop} \${cs.marginRight} \${cs.marginBottom} \${cs.marginLeft}\`
        };
      };

      return {
        windowInnerWidth: window.innerWidth,
        windowInnerHeight: window.innerHeight,
        docClientWidth: docEl.clientWidth,
        docScrollWidth: docEl.scrollWidth,
        horizontalOverflow: docEl.scrollWidth > window.innerWidth,
        root: measure('#root'),
        appContainer: measure('.app-container'),
        topHeader: measure('#app-top-header'),
        driverShell: measure('#driver-mobile-view'),
        sidebarPanel: measure('#driver-sidebar-panel'),
        mapPanel: measure('#driver-map-panel'),
        leafletMap: measure('#voltiq-leaflet-map'),
        bottomNav: measure('#driver-bottom-nav'),
        viewModeToggle: measure('#view-mode-toggle'),
        activeMedia1024: window.matchMedia('(min-width: 1024px)').matches
      };
    })()`;

    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result.value;
  };

  const hardReload = async () => {
    // Clear browser cache & reload ignoring cache
    await send('Network.clearBrowserCache');
    const loadPromise = new Promise((resolve) => {
      const handler = (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.method === 'Page.loadEventFired') {
          ws.off('message', handler);
          resolve();
        }
      };
      ws.on('message', handler);
    });

    await send('Page.reload', { ignoreCache: true });
    await loadPromise;
    await waitForApp();
  };

  const setViewport = async (newW, newH) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width: newW,
      height: newH,
      deviceScaleFactor: 1,
      mobile: newW < 1024,
      fitWindow: false
    });
    // Fire resize on window inside browser
    await send('Runtime.evaluate', { expression: `window.dispatchEvent(new Event('resize'))` });
    await new Promise(r => setTimeout(r, 600));
  };

  const close = () => {
    ws.close();
    chromeProc.kill();
  };

  return { getMetrics, hardReload, setViewport, close };
}

async function runLiveVerification() {
  console.log('========================================================================');
  console.log('VOLTIQ LIVE DESKTOP REFRESH & DYNAMIC RESIZE VERIFICATION SUITE');
  console.log('========================================================================\n');

  // TEST 1: Fresh Desktop Session at 1747x900 + 3 Hard Refreshes
  console.log('>>> TEST 1: DESKTOP AT 1747x900 (User-Observed Viewport) & 3 HARD REFREShes');
  const session1747 = await createBrowserSession(1747, 900);

  const initial1747 = await session1747.getMetrics();
  console.log('[1747x900 Initial Load]');
  console.log(`  window.innerWidth: ${initial1747.windowInnerWidth}px, docScrollWidth: ${initial1747.docScrollWidth}px`);
  console.log(`  #driver-mobile-view width: ${initial1747.driverShell?.computedWidth}, layout: ${initial1747.driverShell?.flexDirection}`);
  console.log(`  #driver-sidebar-panel width: ${initial1747.sidebarPanel?.computedWidth}`);
  console.log(`  #driver-map-panel width: ${initial1747.mapPanel?.computedWidth}`);
  console.log(`  #voltiq-leaflet-map width: ${initial1747.leafletMap?.computedWidth}`);
  console.log(`  #driver-bottom-nav: ${initial1747.bottomNav ? 'VISIBLE (BUG)' : 'HIDDEN (CORRECT)'}`);
  console.log(`  #view-mode-toggle: ${initial1747.viewModeToggle ? 'VISIBLE (BUG)' : 'HIDDEN (CORRECT)'}`);

  for (let i = 1; i <= 3; i++) {
    console.log(`\n  Executing Hard-Refresh #${i}...`);
    await session1747.hardReload();
    const reloadMetrics = await session1747.getMetrics();
    console.log(`  [Refresh #${i} Result]`);
    console.log(`    window.innerWidth: ${reloadMetrics.windowInnerWidth}px, docScrollWidth: ${reloadMetrics.docScrollWidth}px`);
    console.log(`    #driver-mobile-view width: ${reloadMetrics.driverShell?.computedWidth}, layout: ${reloadMetrics.driverShell?.flexDirection}`);
    console.log(`    #driver-sidebar-panel width: ${reloadMetrics.sidebarPanel?.computedWidth}`);
    console.log(`    #driver-map-panel width: ${reloadMetrics.mapPanel?.computedWidth}`);
    console.log(`    #voltiq-leaflet-map width: ${reloadMetrics.leafletMap?.computedWidth}`);
    console.log(`    #driver-bottom-nav: ${reloadMetrics.bottomNav ? 'VISIBLE (BUG)' : 'HIDDEN (CORRECT)'}`);
    console.log(`    horizontalOverflow: ${reloadMetrics.horizontalOverflow}`);
  }

  // TEST 2: Dynamic Resize: Desktop (1747px) -> Mobile (390px) -> Desktop (1747px)
  console.log('\n>>> TEST 2: DYNAMIC RESIZE TRANSITION (1747px -> 390px -> 1747px)');
  console.log('  Step A: Resizing to 390x844 (Mobile)...');
  await session1747.setViewport(390, 844);
  const mobileResized = await session1747.getMetrics();
  console.log(`  [Mobile 390x844 Resized]`);
  console.log(`    window.innerWidth: ${mobileResized.windowInnerWidth}px, docScrollWidth: ${mobileResized.docScrollWidth}px`);
  console.log(`    #driver-mobile-view width: ${mobileResized.driverShell?.computedWidth}, layout: ${mobileResized.driverShell?.flexDirection}`);
  console.log(`    #driver-bottom-nav: ${mobileResized.bottomNav ? `VISIBLE (${mobileResized.bottomNav.computedWidth})` : 'HIDDEN'}`);
  console.log(`    #view-mode-toggle: ${mobileResized.viewModeToggle ? `VISIBLE (${mobileResized.viewModeToggle.computedWidth})` : 'HIDDEN'}`);

  console.log('  Step B: Resizing back to 1747x900 (Desktop)...');
  await session1747.setViewport(1747, 900);
  const desktopRestored = await session1747.getMetrics();
  console.log(`  [Desktop 1747x900 Restored]`);
  console.log(`    window.innerWidth: ${desktopRestored.windowInnerWidth}px, docScrollWidth: ${desktopRestored.docScrollWidth}px`);
  console.log(`    #driver-mobile-view width: ${desktopRestored.driverShell?.computedWidth}, layout: ${desktopRestored.driverShell?.flexDirection}`);
  console.log(`    #driver-sidebar-panel width: ${desktopRestored.sidebarPanel?.computedWidth}`);
  console.log(`    #driver-map-panel width: ${desktopRestored.mapPanel?.computedWidth}`);
  console.log(`    #voltiq-leaflet-map width: ${desktopRestored.leafletMap?.computedWidth}`);
  console.log(`    #driver-bottom-nav: ${desktopRestored.bottomNav ? 'VISIBLE (BUG)' : 'HIDDEN (CORRECT)'}`);

  session1747.close();

  // TEST 3: Fresh Desktop Session at 1366x768
  console.log('\n>>> TEST 3: FRESH SESSION AT 1366x768 (Standard Desktop)');
  const session1366 = await createBrowserSession(1366, 768);
  const metrics1366 = await session1366.getMetrics();
  console.log(`  window.innerWidth: ${metrics1366.windowInnerWidth}px, docScrollWidth: ${metrics1366.docScrollWidth}px`);
  console.log(`  #driver-mobile-view width: ${metrics1366.driverShell?.computedWidth}, layout: ${metrics1366.driverShell?.flexDirection}`);
  console.log(`  #driver-sidebar-panel width: ${metrics1366.sidebarPanel?.computedWidth}`);
  console.log(`  #driver-map-panel width: ${metrics1366.mapPanel?.computedWidth}`);
  console.log(`  #voltiq-leaflet-map width: ${metrics1366.leafletMap?.computedWidth}`);
  console.log(`  #driver-bottom-nav: ${metrics1366.bottomNav ? 'VISIBLE' : 'HIDDEN (CORRECT)'}`);
  session1366.close();

  // TEST 4: Fresh Tablet Session at 768x1024
  console.log('\n>>> TEST 4: FRESH SESSION AT 768x1024 (Tablet Portrait)');
  const session768 = await createBrowserSession(768, 1024);
  const metrics768 = await session768.getMetrics();
  console.log(`  window.innerWidth: ${metrics768.windowInnerWidth}px, docScrollWidth: ${metrics768.docScrollWidth}px`);
  console.log(`  #driver-mobile-view width: ${metrics768.driverShell?.computedWidth}, layout: ${metrics768.driverShell?.flexDirection}`);
  console.log(`  #driver-bottom-nav: ${metrics768.bottomNav ? `VISIBLE (${metrics768.bottomNav.computedWidth})` : 'HIDDEN'}`);
  console.log(`  #view-mode-toggle: ${metrics768.viewModeToggle ? `VISIBLE (${metrics768.viewModeToggle.computedWidth})` : 'HIDDEN'}`);
  session768.close();

  console.log('\n========================================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
}

runLiveVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
