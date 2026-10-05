import {DEFAULT_LOCATION,parts,weather,moonPhase,moonPath,dayIndex,number} from './domain.js';
import {icon} from './icons.js';
import {read,save,cacheKey,forecast,searchCities} from './api.js';
const $=id=>document.getElementById(id);
let location=read('utsuroi-location')??DEFAULT_LOCATION;
try{parts(new Date(),location.timezone);if(!Number.isFinite(location.latitude)||!Number.isFinite(location.longitude))throw Error();}catch{location=DEFAULT_LOCATION;}
let cached=read(cacheKey(location)),data=cached?.data??null,updated=cached?.updated??null;
let activeRequest=null,lastDay='',lastMinute='',failed=false;
function fit(){if(innerWidth<=700&&innerHeight>innerWidth){$('clock').style.transform='';document.body.style.height='';document.body.style.overflow='';return;}const scale=Math.min(innerWidth/1280,innerHeight/720);$('clock').style.transform=`scale(${scale})`;document.body.style.height=`${innerHeight}px`;document.body.style.overflow='hidden';}
addEventListener('resize',fit);fit();
function formatTime(epoch){return epoch?new Intl.DateTimeFormat('ja-JP',{timeZone:location.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(epoch*1000)):'--:--';}
function status(){const age=updated?Date.now()-updated:Infinity;const stale=age>1800000; $('status').textContent=updated?`${failed||stale?'保存済み · ':''}${formatTime(updated/1000)} 更新${failed?' · 接続待ち':''}`:failed?'天気を取得できません · 自動再試行します':'天気を取得しています';}
function renderWeather(now){
 $('location-name').textContent=location.name;
 const current=data?.current, w=weather(current?.weather_code),idx=data?dayIndex(data,now,location.timezone):-1;
 const rise=idx>=0?data.daily.sunrise[idx]:null,set=idx>=0?data.daily.sunset[idx]:null;
 const daytime=rise&&set?now.getTime()/1000>=rise&&now.getTime()/1000<set:current?.is_day===1;
 $('clock').dataset.night=String(!daytime);$('clock').dataset.weather=w.kind;
 $('weather-icon').innerHTML=icon(w.icon,!daytime);$('weather-label').textContent=w.label;
 $('temperature').textContent=number(current?.temperature_2m);$('humidity').textContent=number(current?.relative_humidity_2m);
 $('high').textContent=`↑ ${number(idx>=0?data.daily.temperature_2m_max[idx]:null)}°`;$('low').textContent=`↓ ${number(idx>=0?data.daily.temperature_2m_min[idx]:null)}°`;
 $('sunrise').textContent=formatTime(rise);$('sunset').textContent=formatTime(set);
 let p=rise&&set?Math.max(0,Math.min(1,(now.getTime()/1000-rise)/(set-rise))):0;
 $('sun-dot').setAttribute('cx',24+512*p);$('sun-dot').setAttribute('cy',98-332*p*(1-p));$('sun-dot').style.opacity=daytime?1:0;
 $('sun-progress').style.strokeDasharray=`${daytime?p:0} 1`;
 $('day-phase').textContent=rise&&set?(daytime?'昼の時間':'夜の時間'):'太陽情報なし';
 const moon=moonPhase(now);$('moon-light').setAttribute('d',moonPath(moon.phase));$('moon-name').textContent=moon.name;$('moon-age').textContent=`月齢 ${moon.age.toFixed(1)}`;$('moon').setAttribute('aria-label',`${moon.name}、概算月齢 ${moon.age.toFixed(1)}`);
 renderTimeline(now);status();
}
function renderTimeline(now){
 const key=parts(now,location.timezone).key,h=data?.hourly;
 const indices=h?h.time.map((t,i)=>parts(new Date(t*1000),location.timezone).key===key?i:-1).filter(i=>i>=0):[];
 const stops=indices.map(i=>{const p=parts(new Date(h.time[i]*1000),location.timezone).minuteOfDay/1440*100;return `${weather(h.weather_code[i]).color} ${p}%`;});
 $('weather-ribbon').style.background=stops.length?`linear-gradient(to bottom,${stops.join(',')})`:'#566771';
 $('hour-labels').replaceChildren();
 for(const hour of [0,3,6,9,12,15,18,21,24]){
  const i=indices.find(i=>+parts(new Date(h.time[i]*1000),location.timezone).hour===hour);
  const row=document.createElement('div');row.className='hour-row';row.style.top=`${hour/24*100}%`;
  const valid=i!==undefined, w=weather(valid?h.weather_code[i]:null);
  row.innerHTML=`<span class="hour">${String(hour).padStart(2,'0')}</span>${hour===24?'':icon(w.icon,valid&&h.is_day[i]===0)+`<span class="hour-temp">${number(valid?h.temperature_2m[i]:null)}°</span>`}`;
  if(valid&&h.precipitation_probability[i]>0){const p=document.createElement('span');p.className='rain-chance';p.textContent=`${h.precipitation_probability[i]}%`;row.append(p);}
  row.setAttribute('aria-label',`${hour}時 ${valid?w.label+' '+number(h.temperature_2m[i])+'度':'予報なし'}`);$('hour-labels').append(row);
 }
}
function tick(){const now=new Date(),p=parts(now,location.timezone);$('time').textContent=`${p.hour}:${p.minute}`;$('time').dateTime=now.toISOString();$('seconds').textContent=p.second;$('seconds-fill').style.width=`${+p.second/59*100}%`;$('date').textContent=new Intl.DateTimeFormat('ja-JP',{timeZone:location.timezone,month:'long',day:'numeric',weekday:'long'}).format(now);$('now-marker').style.top=`${p.minuteOfDay/1440*100}%`;$('now-label').textContent=`${p.hour}:${p.minute}`;
 if(lastMinute!==`${p.key}:${p.hour}:${p.minute}`){renderWeather(now);lastMinute=`${p.key}:${p.hour}:${p.minute}`;}
 if(lastDay&&lastDay!==p.key)loadWeather();lastDay=p.key;
}
async function loadWeather(){
 if(activeRequest)activeRequest.abort();const controller=new AbortController();activeRequest=controller;const loc=location;
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{const fresh=await forecast(loc,controller.signal);if(loc!==location)return;data=fresh;updated=Date.now();failed=false;save(cacheKey(loc),{data,updated});}
 catch{if(loc===location&&activeRequest===controller)failed=true;}
 finally{clearTimeout(timeout);if(activeRequest===controller){activeRequest=null;renderWeather(new Date());}}
}
$('location-button').onclick=()=>{$('settings').showModal();$('city').focus();};$('close-settings').onclick=()=>$('settings').close();
let searchId=0;
$('search-form').onsubmit=async event=>{event.preventDefault();const id=++searchId;$('search-status').textContent='検索中…';$('results').replaceChildren();try{const cities=await searchCities($('city').value.trim());if(id!==searchId)return;$('search-status').textContent=cities.length?'表示する街を選んでください':'見つかりませんでした。英語名でも試してください。';for(const city of cities){const button=document.createElement('button');button.type='button';button.textContent=`${city.name} — ${city.detail}`;button.onclick=()=>{location=city;save('utsuroi-location',location);cached=read(cacheKey(location));data=cached?.data??null;updated=cached?.updated??null;failed=false;lastDay='';lastMinute='';$('settings').close();tick();loadWeather();};$('results').append(button);}}catch{if(id===searchId)$('search-status').textContent='検索できませんでした。接続を確認してください。';}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('status').textContent='このブラウザは全画面表示に対応していません';}};
// The tab can recover from sleep, network loss, and a midnight rollover.
addEventListener('online',()=>loadWeather());document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();if(!updated||Date.now()-updated>900000)loadWeather();}});
tick();loadWeather();setInterval(tick,1000);setInterval(loadWeather,900000);
