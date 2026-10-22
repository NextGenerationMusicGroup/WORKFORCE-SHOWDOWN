const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Workforce Showdown" }));

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { leaderboard: [], tournaments: [], nextTournamentId: 1 }; }
}
let data = loadData();
function saveData() { try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error("Could not save game data:", e.message); } }
function safeName(n) { return String(n || "Anonymous Fighter").trim().replace(/[<>]/g, "").slice(0, 24) || "Anonymous Fighter"; }
function getPlayerRecord(name) {
  name = safeName(name);
  let r = data.leaderboard.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!r) { r = { name, wins: 0, losses: 0, tournaments: 0, points: 0 }; data.leaderboard.push(r); }
  return r;
}
app.get("/api/leaderboard", (_req, res) => res.json([...data.leaderboard].sort((a,b)=>b.points-a.points || b.wins-a.wins).slice(0,50)));
app.get("/api/tournaments", (_req, res) => res.json(data.tournaments.slice(-20).reverse()));
app.post("/api/tournaments", (req, res) => {
  const name = safeName(req.body && req.body.name);
  let active = data.tournaments.find(t => t.status === "registration" && t.players.length < 8);
  if (!active) {
    active = { id: data.nextTournamentId++, title: "Shift Showdown Cup", status: "registration", players: [], createdAt: new Date().toISOString(), bracket: [] };
    data.tournaments.push(active);
  }
  if (!active.players.some(p => p.toLowerCase() === name.toLowerCase())) active.players.push(name);
  if (active.players.length >= 4) {
    active.status = "ready";
    active.bracket = [];
    for (let i=0;i<active.players.length;i+=2) {
      if (active.players[i+1]) active.bracket.push({ round: 1, fighter1: active.players[i], fighter2: active.players[i+1], status: "waiting", winner: null });
    }
  }
  saveData(); res.json(active);
});

const rooms = new Map();
const W = 900, FLOOR = 370;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function makeFighter(id, slot, role, name) {
  return { id, slot, role, name: safeName(name || (role === "boss" ? "Boss Fighter" : "Employee Fighter")),
    x: slot === 1 ? 250 : 650, y: FLOOR, hp: 100, facing: slot === 1 ? 1 : -1,
    attacking: 0, blocking: false, cooldown: 0, wins: 0, input: {}, scored: false };
}
function stateOf(room) {
  return { code: room.code, mode: room.mode, players: [...room.players.values()].map(p => ({
    id:p.id, slot:p.slot, role:p.role, name:p.name, x:p.x, y:p.y, hp:p.hp, facing:p.facing,
    attacking:p.attacking, blocking:p.blocking, wins:p.wins
  })), started: room.players.size === 2, roundOver: !!room.roundOver, winner: room.winner || null };
}
function emitRoom(room) { io.to(room.code).emit("state", stateOf(room)); }
function resetRound(room) {
  [...room.players.values()].forEach((p,i)=>Object.assign(p,{x:i===0?250:650,y:FLOOR,hp:100,facing:i===0?1:-1,attacking:0,blocking:false,cooldown:0,input:{},scored:false}));
  room.roundOver=false; room.winner=null;
}
function roomFor(socket) { for (const r of rooms.values()) if (r.players.has(socket.id)) return r; return null; }
function recordResult(room, winner, loser) {
  if (!winner || !loser || room.resultRecorded) return;
  room.resultRecorded = true;
  const w = getPlayerRecord(winner.name), l = getPlayerRecord(loser.name);
  w.wins++; w.points += 3; l.losses++; saveData();
  io.emit("leaderboardUpdated");
}
io.on("connection", socket => {
  socket.on("createRoom", ({role, mode, name}={}) => {
    let code; do { code = Math.random().toString(36).slice(2,7).toUpperCase(); } while (rooms.has(code));
    const m = mode === "freeforall" ? "freeforall" : "employees-vs-bosses";
    const r = { code, mode:m, players:new Map(), roundOver:false, winner:null, resultRecorded:false };
    const normalizedRole = m === "freeforall" ? "fighter" : (role === "boss" ? "boss" : "employee");
    r.players.set(socket.id, makeFighter(socket.id,1,normalizedRole,name));
    rooms.set(code,r); socket.join(code); socket.emit("joined",{code,slot:1,role:normalizedRole,mode:m}); emitRoom(r);
  });
  socket.on("joinRoom", ({code,role,name}={}) => {
    code=String(code||"").trim().toUpperCase(); const r=rooms.get(code);
    if(!r) return socket.emit("notice","Room not found. Check the code.");
    if(r.players.size>=2) return socket.emit("notice","This room already has two fighters.");
    const normalizedRole = r.mode === "freeforall" ? "fighter" : (role === "boss" ? "boss" : "employee");
    r.players.set(socket.id,makeFighter(socket.id,2,normalizedRole,name)); socket.join(code);
    socket.emit("joined",{code,slot:2,role:normalizedRole,mode:r.mode});
    io.to(code).emit("notice","Both fighters connected. FIGHT!"); emitRoom(r);
  });
  socket.on("input", input => {
    const r=roomFor(socket); if(!r||r.roundOver)return; const p=r.players.get(socket.id); if(!p)return;
    p.input={left:!!input.left,right:!!input.right,jump:!!input.jump,attack:!!input.attack,block:!!input.block,special:!!input.special};
    if(input.special&&p.cooldown<=0){p.attacking=20;p.cooldown=48;}
    else if(input.attack&&p.cooldown<=0){p.attacking=12;p.cooldown=24;}
    p.blocking=!!input.block;
  });
  socket.on("rematch",()=>{const r=roomFor(socket);if(!r||r.players.size!==2)return;r.resultRecorded=false;resetRound(r);emitRoom(r);});
  socket.on("disconnect",()=>{const r=roomFor(socket);if(r){r.players.delete(socket.id);if(!r.players.size)rooms.delete(r.code);else{io.to(r.code).emit("notice","Your opponent disconnected.");emitRoom(r);}}});
});
setInterval(()=>{
  for(const r of rooms.values()){
    if(r.players.size!==2||r.roundOver)continue; const ps=[...r.players.values()];
    for(const p of ps){
      const i=p.input||{}; if(i.left)p.x-=5;if(i.right)p.x+=5;
      if(i.jump&&p.y>=FLOOR)p.y=FLOOR-80;else if(p.y<FLOOR)p.y=Math.min(FLOOR,p.y+5);
      p.x=clamp(p.x,55,W-55);p.cooldown=Math.max(0,p.cooldown-1);p.attacking=Math.max(0,p.attacking-1);
    }
    ps[0].facing=ps[1].x>=ps[0].x?1:-1;ps[1].facing=-ps[0].facing;
    for(const a of ps){
      if(a.attacking===10||a.attacking===18){
        const t=ps.find(p=>p.id!==a.id);
        if(Math.abs(t.x-a.x)<105&&Math.abs(t.y-a.y)<100){
          const damage=a.attacking===18?16:9;t.hp=Math.max(0,t.hp-(t.blocking?Math.ceil(damage*.25):damage));
        }
      }
    }
    const defeated=ps.find(p=>p.hp<=0);
    if(defeated){
      r.roundOver=true;r.winner=ps.find(p=>p.id!==defeated.id).id;
      const winner=ps.find(p=>p.id===r.winner); recordResult(r,winner,defeated);
      io.to(r.code).emit("notice",winner.name+" wins! +3 leaderboard points.");
    }
    emitRoom(r);
  }
},1000/30);
server.listen(PORT,()=>console.log("Workforce Showdown listening on "+PORT));
