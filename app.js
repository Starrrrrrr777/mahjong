const $ = (id) => document.getElementById(id);
const TYPES = [...[1, 9].flatMap(n => [`${n}m`]), ...Array.from({length:9},(_,i)=>`${i+1}p`), ...Array.from({length:9},(_,i)=>`${i+1}s`), ...['1z','2z','3z','4z','5z','6z','7z']];
const NAMES = { '1m':'一萬','9m':'九萬','1p':'一筒','2p':'二筒','3p':'三筒','4p':'四筒','5p':'五筒','6p':'六筒','7p':'七筒','8p':'八筒','9p':'九筒','1s':'一索','2s':'二索','3s':'三索','4s':'四索','5s':'五索','6s':'六索','7s':'七索','8s':'八索','9s':'九索','1z':'東','2z':'南','3z':'西','4z':'北','5z':'白','6z':'發','7z':'中' };
let game;
function buildWall() { return TYPES.flatMap(t => Array.from({length:4},(_,i)=>({t,red:(t==='5p'||t==='5s') && i===0}))); }
function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function sortHand(h) { const order=t=>TYPES.indexOf(t.t); h.sort((a,b)=>order(a)-order(b)||Number(b.red)-Number(a.red)); }
function key(tile) { return tile.t+(tile.red?'r':''); }
function typeIndex(t) { return TYPES.indexOf(t); }
function counts(hand) { const c=Array(TYPES.length).fill(0); hand.forEach(x=>c[typeIndex(x.t)]++); return c; }
function isAgari(hand) { if(hand.length!==14) return false; const c=counts(hand); if(c.filter(n=>n===2).length===7) return true; const terminals=[0,1,2,10,11,19,20,21,22,23,24,25]; if(terminals.every(i=>c[i]) && c.some(n=>n>=2 && terminals.includes(c.indexOf(n)))) return true;
  for(let i=0;i<c.length;i++) if(c[i]>=2){c[i]-=2;if(canMeld(c,0)){c[i]+=2;return true;}c[i]+=2;} return false; }
function canMeld(c,start) { while(start<c.length&&!c[start]) start++; if(start===c.length)return true; if(c[start]>=3){c[start]-=3;if(canMeld(c,start)){c[start]+=3;return true;}c[start]+=3;} const t=TYPES[start], n=Number(t[0]), suit=t[1]; if(suit!=='z'&&n<=7&&TYPES[start+1]?.[1]===suit&&c[start+1]&&c[start+2]){c[start]--;c[start+1]--;c[start+2]--;if(canMeld(c,start)) {c[start]++;c[start+1]++;c[start+2]++;return true;}c[start]++;c[start+1]++;c[start+2]++;} return false; }
function tenpai(hand) { return TYPES.filter(t=>isAgari([...hand,{t,red:false}])).map(t=>t); }
function shanten(hand) { if(isAgari(hand)) return -1; if(tenpai(hand).length)return 0; // bounded, practical distance to a tenpai hand
  let best=3; const c=counts(hand); for(let a=0;a<TYPES.length;a++) if(c[a]) { const copy=hand.slice(); copy.splice(copy.findIndex(x=>x.t===TYPES[a]),1); for(const t of TYPES){if(isAgari([...copy,{t,red:false},{t,red:false}])) best=Math.min(best,1);} } return best; }
function bestDiscards(hand) { let best=9, choices=[]; hand.forEach((tile,i)=>{const rest=hand.filter((_,j)=>j!==i); const score=shanten(rest); if(score<best){best=score;choices=[i];}else if(score===best)choices.push(i);}); return {score:best,choices}; }
function availableWaits(waitTypes){ return waitTypes.reduce((n,t)=>n+(4-game.discarded.filter(x=>x.t===t).length),0); }
function takeTile() { return game.wall.pop(); }
function extractNorth(player) { let found, replacement=null; while((found=player.hand.findIndex(x=>x.t==='4z'))>=0){ player.hand.splice(found,1); player.kita++; if(game.wall.length){replacement=takeTile();player.hand.push(replacement);} } sortHand(player.hand); return replacement; }
function deal(player,n){for(let i=0;i<n;i++)player.hand.push(takeTile());extractNorth(player);}
function playerDraw(player){let tile=takeTile();while(tile?.t==='4z'){player.kita++;tile=takeTile();}return tile;}
function startGame(){ game={wall:shuffle(buildWall()),discarded:[],players:[{name:'あなた',hand:[],drawn:null,river:[],kita:0,riichi:false,waits:[]},{name:'CPU A',hand:[],river:[],kita:0,riichi:false,waits:[]},{name:'CPU B',hand:[],river:[],kita:0,riichi:false,waits:[]}], turn:true, ended:false}; game.players.forEach(p=>deal(p,13)); game.players[0].drawn=playerDraw(game.players[0]); $('start-game').textContent='対局中'; $('start-game').disabled=true; $('message').textContent='不要な牌を1枚クリックして捨ててください。'; render(); }
function cpuTurn(cpu){ if(game.ended||!game.wall.length)return; const drawn=takeTile(); cpu.hand.push(drawn); const replacement=extractNorth(cpu); const effectiveDrawn=replacement||drawn; if(isAgari(cpu.hand)){ $('message').textContent=`${cpu.name} がツモ和了しました。あなたのテンパイを目指しましょう。`; return; } let idx;
  if(cpu.riichi) idx=cpu.hand.findLastIndex(t=>t===effectiveDrawn);
  else { const best=bestDiscards(cpu.hand); idx=best.choices[Math.floor(Math.random()*best.choices.length)]; }
  if(idx<0) idx=cpu.hand.length-1; const tile=cpu.hand.splice(idx,1)[0]; cpu.river.push({...tile,tsumogiri:tile===effectiveDrawn}); game.discarded.push(tile); if(!cpu.riichi){cpu.waits=tenpai(cpu.hand); if(cpu.waits.length){cpu.riichi=true;$('message').textContent=`${cpu.name} がリーチ！ 放銃に注意して牌を選びましょう。`; }} }
function playerDiscard(which){ if(!game.turn||game.ended)return; const p=game.players[0]; let tile;if(which==='draw'){tile=p.drawn;p.drawn=null;}else{tile=p.hand.splice(which,1)[0];p.hand.push(p.drawn);p.drawn=null;sortHand(p.hand);} const loser=game.players.slice(1).find(cpu=>cpu.riichi&&cpu.waits.includes(tile.t)); p.river.push(tile);game.discarded.push(tile); if(loser){end(false,`${loser.name} の待ち「${loser.waits.map(t=>NAMES[t]).join('・')}」に ${NAMES[tile.t]} を放銃しました。`);return;} if(tenpai(p.hand).length){end(true,`テンパイ！ 待ちは「${tenpai(p.hand).map(t=>NAMES[t]).join('・')}」です。`);return;} game.turn=false; cpuTurn(game.players[1]); cpuTurn(game.players[2]); if(game.wall.length){p.drawn=playerDraw(p);game.turn=true;$('message').textContent=$('message').textContent.includes('リーチ')?$ ('message').textContent:'ツモりました。不要な牌を1枚捨ててください。';}else end(false,'山がなくなりました。'); render(); }
function tileFace(tile) {
  const number=Number(tile.t[0]), suit=tile.t[1], red=tile.red?' red':'';
  if(suit==='m') return `<span class="tile-text man-number${red}">${number}萬</span>`;
  if(suit==='p') return `<span class="tile-text pin-text${red}">${number}筒</span>`;
  if(suit==='s') return `<span class="tile-text sou-text${red}">${number}索</span>`;
  return `<span class="honor honor-${number}">${NAMES[tile.t]}</span>`;
}
function tileNode(tile,small=false,button=false){const el=document.createElement(button?'button':'span');el.className=`tile${tile.red?' red':''}${small?' small':''}`;el.innerHTML=tileFace(tile);el.title=tile.red?`${NAMES[tile.t]}（赤ドラ）`:NAMES[tile.t];el.setAttribute('aria-label',el.title);if(button)el.type='button';return el;}
function render(){if(!game)return; const [you,a,b]=game.players; [['a',a],['b',b]].forEach(([id,p])=>{const hand=$( `cpu-${id}-hand`);hand.innerHTML='';for(let i=0;i<p.hand.length;i++){const x=document.createElement('span');x.className='back';hand.append(x);} const river=$( `cpu-${id}-river`);river.innerHTML='';p.river.forEach(t=>{const el=tileNode(t,true);if(t.tsumogiri){el.classList.add('tsumogiri');el.title+='（ツモ切り）';}river.append(el);});$(`cpu-${id}-state`).textContent=`${p.riichi?'リーチ！ ':''}北 ${p.kita}枚`;}); const y=$('your-hand');y.innerHTML='';sortHand(you.hand);you.hand.forEach((t,i)=>{const el=tileNode(t,false,true);el.disabled=!game.turn||game.ended;el.onclick=()=>playerDiscard(i);y.append(el);});if(you.drawn){const separator=document.createElement('span');separator.className='draw-separator';y.append(separator);const drawn=tileNode(you.drawn,false,true);drawn.classList.add('drawn-tile');drawn.disabled=!game.turn||game.ended;drawn.onclick=()=>playerDiscard('draw');y.append(drawn);}const river=$('your-river');river.innerHTML='';you.river.forEach(t=>river.append(tileNode(t,true)));const handShanten=you.drawn?bestDiscards([...you.hand,you.drawn]).score:shanten(you.hand);$('you-state').textContent=`北抜き ${you.kita}枚 / ${handShanten}シャンテン`; $('wall-count').textContent=`山 ${game.wall.length}枚`; const riichi=game.players.slice(1).filter(p=>p.riichi);$('danger').hidden=!riichi.length;$('danger').textContent=riichi.length?`危険：${riichi.map(p=>p.name).join('・')} がリーチ中` : '';}
function end(win,text){game.ended=true;game.turn=false;render();$('result-title').textContent=win?'クリア！':'ゲームオーバー';$('result-text').textContent=text;$('result-dialog').showModal();}
$('open-efficiency').onclick=()=>{
  $('home-screen').hidden=true;
  $('game-screen').hidden=false;
  startGame();
};
$('back-home').onclick=()=>{$('game-screen').hidden=true;$('home-screen').hidden=false;};
$('start-game').onclick=startGame;$('new-game').onclick=startGame;$('play-again').onclick=()=>{$('result-dialog').close();startGame();};
render();
