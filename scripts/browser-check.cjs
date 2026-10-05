require('node:fs').mkdirSync('artifacts',{recursive:true});
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:new Date('2026-10-05T11:23:36Z')});
const start=Date.parse('2026-10-04T15:00Z')/1000;
const fixture={current:{temperature_2m:19.4,relative_humidity_2m:68,weather_code:2,is_day:0},hourly:{time:[],temperature_2m:[],weather_code:[],precipitation_probability:[],is_day:[]},daily:{time:[start,start+86400,start+172800],sunrise:[start+5.7*3600,start+86400+5.7*3600,start+172800+5.7*3600],sunset:[start+17.3*3600,start+86400+17.3*3600,start+172800+17.3*3600],temperature_2m_max:[23,24,25],temperature_2m_min:[16,16,17]}};
for(let i=0;i<72;i++){fixture.hourly.time.push(start+i*3600);fixture.hourly.temperature_2m.push(19+Math.sin(i/24*Math.PI*2)*4);fixture.hourly.weather_code.push(i%24<8?3:i%24<15?0:i%24<19?61:2);fixture.hourly.precipitation_probability.push(i%24>=15&&i%24<19?70:0);fixture.hourly.is_day.push(i%24>=6&&i%24<18?1:0);}
await page.route('https://api.open-meteo.com/**',r=>r.fulfill({json:fixture}));await page.route('https://geocoding-api.open-meteo.com/**',r=>r.fulfill({json:{results:[{name:'東京',latitude:35.68,longitude:139.69,timezone:'Asia/Tokyo',country:'日本'}]}}));
await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelector('#temperature').textContent==='19');await page.screenshot({path:'artifacts/clock-night.png'});
if(await page.locator('#time').textContent()!=='20:23')throw Error('clock');await page.getByRole('button',{name:'天気の地点を変更'}).click();await page.locator('#city').fill('Tokyo');await page.getByRole('button',{name:'検索',exact:true}).click();await page.getByRole('button',{name:'東京 — 日本'}).click();if(await page.locator('#location-name').textContent()!=='東京')throw Error('location');
await page.setViewportSize({width:800,height:480});await page.screenshot({path:'artifacts/clock-small.png'});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/clock-mobile.png'});
await page.setViewportSize({width:1280,height:720});await page.clock.setSystemTime(new Date('2026-10-05T03:23:36Z'));await page.clock.runFor(1000);await page.screenshot({path:'artifacts/clock-day.png'});
await page.unroute('https://api.open-meteo.com/**');await page.route('https://api.open-meteo.com/**',r=>r.abort());await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('接続待ち'));if(await page.locator('#temperature').textContent()!=='19')throw Error('cache');
if(errors.length)throw Error(errors.join(';'));
console.log(JSON.stringify({errors,checks:['1280x720','800x480','390x844','location search','cached offline data','day/night change']},null,2));await browser.close();})();
